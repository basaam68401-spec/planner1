import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import webpush from 'npm:web-push@3.6.7';
import {dueEvents} from './schedule.ts';

// Server-side Web Push for the GitHub Pages PWA. Private VAPID key stays in Supabase Secrets.
function hash(value:string){let h=2166136261;for(const c of value){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function allowedEndpoint(raw:string){
  try{const u=new URL(raw);if(u.protocol!=='https:')return false;
    return ['fcm.googleapis.com','updates.push.services.mozilla.com'].includes(u.hostname)
      ||u.hostname.endsWith('.push.apple.com')
      ||u.hostname.endsWith('.notify.windows.com');
  }catch(_){return false}
}
function reply(value:unknown,status=200){return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8'}})}

if(import.meta.main)Deno.serve(async(req:Request)=>{
  if(req.method!=='POST')return reply({ok:false,error:'Method not allowed'},405);
  const secret=Deno.env.get('PLANNER_CRON_SECRET')?.trim();
  if(!secret||req.headers.get('x-cron-secret')!==secret)return reply({ok:false,error:'Unauthorized'},401);
  const url=Deno.env.get('SUPABASE_URL')?.trim(),role=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  const pub=Deno.env.get('VAPID_PUBLIC_KEY')?.trim(),priv=Deno.env.get('VAPID_PRIVATE_KEY')?.trim(),subject=Deno.env.get('VAPID_SUBJECT')?.trim();
  if(!url||!role||!pub||!priv||!subject)return reply({ok:false,error:'Missing server configuration'},500);
  webpush.setVapidDetails(subject,pub,priv);
  const db=createClient(url,role,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const now=new Date(),{data:subscriptions,error:subError}=await db.from('planner_push_subscriptions').select('endpoint,user_id,subscription');
  if(subError)return reply({ok:false,error:subError.message},500);
  const byUser=new Map<string,Array<{endpoint:string;user_id:string;subscription:any}>>();
  for(const sub of subscriptions||[]){const rows=byUser.get(sub.user_id)||[];rows.push(sub);byUser.set(sub.user_id,rows)}
  let sent=0,skipped=0,failed=0;
  for(const [userId,devices] of byUser){
    const {data:record,error:stateError}=await db.from('planner_states').select('state').eq('user_id',userId).maybeSingle();
    if(stateError||!record?.state){failed++;continue}
    const events=dueEvents(record.state,now);
    for(const device of devices){
      if(!allowedEndpoint(device.endpoint)){failed++;continue}
      const subscription=device.subscription;
      if(subscription?.endpoint!==device.endpoint||!subscription?.keys?.p256dh||!subscription?.keys?.auth){failed++;continue}
      for(const event of events){
        const dedupe=`push:${hash(device.endpoint)}:${event.key}`;
        const {error:claim}=await db.from('planner_cron_deliveries').insert({user_id:userId,dedupe_key:dedupe,kind:'push',status:'pending',detail:{device:hash(device.endpoint)}});
        if(claim){if(claim.code==='23505'){skipped++;continue}failed++;continue}
        try{
          await webpush.sendNotification(subscription,JSON.stringify({title:event.title,body:event.body,tag:event.key}),{TTL:3600,urgency:'normal'});
          await db.from('planner_cron_deliveries').update({status:'sent',sent_at:new Date().toISOString()}).eq('user_id',userId).eq('dedupe_key',dedupe);
          sent++;
        }catch(error){
          failed++;
          const status=Number((error as {statusCode?:number})?.statusCode||0);
          if(status===404||status===410)await db.from('planner_push_subscriptions').delete().eq('endpoint',device.endpoint).eq('user_id',userId);
          await db.from('planner_cron_deliveries').delete().eq('user_id',userId).eq('dedupe_key',dedupe);
        }
      }
    }
  }
  return reply({ok:true,checkedAt:now.toISOString(),sent,skipped,failed});
});
