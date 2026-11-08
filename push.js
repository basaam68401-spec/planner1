'use strict';

// Remote Web Push setup. No private key or subscription endpoint enters localStorage.
function v782PushKey(){return String(window.PLANNER_PUSH_PUBLIC_KEY||'').trim()}
function v782KeyBytes(value){const b64=value.replace(/-/g,'+').replace(/_/g,'/');const raw=atob(b64.padEnd(Math.ceil(b64.length/4)*4,'='));return Uint8Array.from(raw,c=>c.charCodeAt(0))}
function v782PushSupport(){return !!(window.isSecureContext&&'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window)}
function v782PushStatus(){
  if(!v782PushSupport())return 'این مرورگر یا شیوه نصب از Web Push پشتیبانی نمی‌کند.';
  if(Notification.permission==='denied')return 'اجازه اعلان در تنظیمات مرورگر مسدود شده است.';
  if(!cloud?.user)return 'برای اعلان هنگام بسته‌بودن برنامه، ابتدا وارد حساب ابری شو.';
  if(!v782PushKey())return 'کلید عمومی Web Push هنوز در تنظیمات برنامه ثبت نشده است.';
  return Notification.permission==='granted'?'آماده فعال‌سازی روی این دستگاه':'برای فعال‌سازی، اجازه اعلان را تأیید کن.';
}
async function v782EnablePush(){
  const status=document.getElementById('v782PushStatus');
  try{
    if(!v782PushSupport())throw new Error('Web Push در این مرورگر پشتیبانی نمی‌شود.');
    if(!cloud?.user||!cloud?.client)throw new Error('ابتدا وارد حساب ابری شو.');
    if(!v782PushKey())throw new Error('کلید عمومی VAPID تنظیم نشده است.');
    // Permission and subscription are both initiated by the user's click.
    const permission=await Notification.requestPermission();
    if(permission!=='granted')throw new Error('اجازه اعلان داده نشد.');
    const reg=await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:v782KeyBytes(v782PushKey())});
    const payload=sub.toJSON();
    const {error}=await cloud.client.from('planner_push_subscriptions').upsert({user_id:cloud.user.id,endpoint:sub.endpoint,subscription:payload,updated_at:new Date().toISOString()},{onConflict:'endpoint'});
    if(error)throw error;
    S.settingsV7=S.settingsV7||{};S.settingsV7.notificationV75=S.settingsV7.notificationV75||{};
    S.settingsV7.notificationV75.pushEnabled=true;
    S.settingsV7.notificationV75.pushDailyDigest=true;
    save();
    if(status)status.textContent='اعلان واقعی روی این دستگاه فعال شد. یادآورها از سرور ارسال می‌شوند.';
  }catch(e){if(status)status.textContent='فعال‌سازی ناموفق: '+(e.message||e)}
}
async function v782DisablePush(){
  const status=document.getElementById('v782PushStatus');
  try{
    const reg=await navigator.serviceWorker.getRegistration(),sub=reg?await reg.pushManager.getSubscription():null;
    if(sub){
      let removeError=null;
      if(cloud?.user&&cloud?.client){const {error}=await cloud.client.from('planner_push_subscriptions').delete().eq('user_id',cloud.user.id).eq('endpoint',sub.endpoint);removeError=error}
      await sub.unsubscribe();
      if(removeError)throw removeError;
    }
    if(S.settingsV7?.notificationV75){S.settingsV7.notificationV75.pushEnabled=false;save()}
    if(status)status.textContent='اعلان این دستگاه غیرفعال شد.';
  }catch(e){if(status)status.textContent='غیرفعال‌سازی ناموفق: '+(e.message||e)}
}
function v782PushPanel(){
  if(view!=='automationV7')return;
  const app=document.getElementById('app');if(!app)return;
  document.getElementById('v75InstallmentAlerts')?.closest('label')?.classList.add('hide');
  document.getElementById('v75SystemAlerts')?.closest('label')?.classList.add('hide');
  app.querySelectorAll('[onclick*="v75QuickMoney"]').forEach(x=>x.remove());
  app.querySelectorAll('p').forEach(p=>{if(p.textContent.includes('اعلان محلی زمانی'))p.textContent='اعلان محلی فقط هنگام بازبودن برنامه بررسی می‌شود. اعلان گوشی در بخش زیر از Web Push استفاده می‌کند.'});
  const panel=document.createElement('section');panel.className='card v782PushPanel';
  panel.innerHTML=`<h3>اعلان گوشی، مستقل از تلگرام</h3><p>پس از راه‌اندازی سرور طبق راهنما، کارهای دارای ساعت و یادآور و خلاصه صبحگاهی روز حتی با بسته‌بودن PWA اعلان می‌فرستند.</p><p class="muted">آیفون: iOS/iPadOS 16.4 یا جدیدتر، افزودن برنامه به صفحه اصلی و فعال‌سازی از داخل همان برنامه لازم است. اتصال ابری و مجوز اعلان نیز باید فعال باشند.</p><p id="v782PushStatus" role="status">${esc(v782PushStatus())}</p><div class="v782PushActions"><button class="primary" type="button" onclick="v782EnablePush()">فعال‌سازی روی این دستگاه</button><button type="button" onclick="v782DisablePush()">غیرفعال‌سازی این دستگاه</button></div>`;
  app.insertAdjacentElement('afterbegin',panel);
}
window.v782EnablePush=v782EnablePush;window.v782DisablePush=v782DisablePush;
const v782PushRenderBase=render;
render=function(){const out=v782PushRenderBase();v782PushPanel();return out};window.render=render;
const v782QuickBase=v75OpenQuick;
v75OpenQuick=function(){v782QuickBase();document.getElementById('v75QuickForm')?.querySelectorAll('[onclick*="v75QuickMoney"]').forEach(x=>x.remove())};window.v75OpenQuick=v75OpenQuick;
const v782SignOutBase=cloudSignOut;
cloudSignOut=async function(){if(v782PushSupport()){try{await v782DisablePush()}catch(_){}}return v782SignOutBase()};window.cloudSignOut=cloudSignOut;
