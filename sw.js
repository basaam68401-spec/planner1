const CACHE='planner-for-best-life-v7-8-2';
const ASSETS=['./','./index.html','./styles.css','./app.js','./v7.js','./v72.js','./v73.js','./v74.js','./v75.js','./v76.js','./v77.js','./v78.js','./v781.js','./v782.js','./push.js','./supabase-config.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin){
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    fetch(event.request).then(response=>{
      if(response&&response.ok){
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
      }
      return response;
    }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./index.html')))
  );
});

self.addEventListener('message',event=>{
  if(event.data?.type!=='SHOW_NOTIFICATION')return;
  const {title,options}=event.data;
  event.waitUntil(self.registration.showNotification(title||'Planner for Best Life',options||{}));
});

self.addEventListener('push',event=>{
  let payload={};
  try{payload=event.data?.json()||{}}catch(_){payload={title:'Planner for Best Life',body:event.data?.text()||''}}
  const title=String(payload.title||'یادآور برنامه');
  const options={body:String(payload.body||''),icon:'./icons/icon-192.png',badge:'./icons/icon-192.png',tag:String(payload.tag||''),data:{url:'./?view=daily'}};
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification?.data?.url||'./';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){
      if('focus'in client){client.navigate(target).catch(()=>{});return client.focus();}
    }
    return clients.openWindow?clients.openWindow(target):undefined;
  }));
});
