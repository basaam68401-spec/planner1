'use strict';

// ===== Planner Life for Soil 7.6 =====
// ثبت سریع و صوتی فارسی، اعلان مرورگر، گزارش خودکار و زیرساخت امن ربات تلگرام.
const V75_SCHEMA='planner-life-os-v7.5';
const V75_NOTIFICATION_LIMIT=250;
const V75_REPORT_LIMIT=52;
const V75_CHECK_INTERVAL=60*1000;
let v75Recognition=null;
let v75VoiceActive=false;
let v75VoiceBase='';
let v75UsedVoice=false;
let v75CheckTimer=null;
let v75Checking=false;

function v75Now(){return new Date().toISOString()}
function v75Uid(prefix='v75'){return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`}
function v75Num(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f}
function v75Hash(text=''){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function v75Minutes(time='00:00'){const m=String(time).match(/^(\d{1,2}):(\d{2})$/);return m?Math.max(0,Math.min(1439,+m[1]*60+ +m[2])):0}
function v75NowMinutes(){const d=new Date();return d.getHours()*60+d.getMinutes()}
function v75WeekdayIndex(){return (new Date().getDay()+1)%7}
function v75IsAtOrAfter(time){return v75NowMinutes()>=v75Minutes(time)}
function v75IsQuiet(){const s=v75Settings(),n=v75NowMinutes(),a=v75Minutes(s.quietFrom),b=v75Minutes(s.quietTo);return a===b?false:(a<b?n>=a&&n<b:n>=a||n<b)}
function v75EscText(s=''){return String(s).replace(/[<>]/g,'')}
function v75TelegramText(s=''){return String(s).slice(0,3900)}
function v75DateToIso(j){try{const d=jToDate(j);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}catch(_){return ''}}

function v75DefaultSettings(){
  return {
    enabled:false,
    browserEnabled:false,
    taskAlerts:true,
    installmentAlerts:true,
    goalAlerts:true,
    systemAlerts:true,
    dailyDigest:true,
    dailyDigestTime:'08:00',
    weeklyReport:true,
    weeklyReportTime:'18:00',
    quietFrom:'22:30',
    quietTo:'07:00',
    telegramEnabled:false,
    telegramChatId:'',
    telegramFunctionName:'planner-telegram',
    telegramDailyDigest:false,
    telegramWeeklyReport:true,
    telegramCriticalAlerts:true,
    updatedAt:v75Now()
  };
}
function v75EnsureState(){
  S.settingsV7=S.settingsV7||{};
  S.settingsV7.notificationV75=Object.assign(v75DefaultSettings(),S.settingsV7.notificationV75||{});
  S.notifications=Array.isArray(S.notifications)?S.notifications:[];
  S.autoReports=Array.isArray(S.autoReports)?S.autoReports:[];
  S.notifications=S.notifications.sort((a,b)=>String(b.sentAt||b.createdAt||'').localeCompare(String(a.sentAt||a.createdAt||''))).slice(0,V75_NOTIFICATION_LIMIT);
  S.autoReports=S.autoReports.sort((a,b)=>String(b.weekStart||b.createdAt||'').localeCompare(String(a.weekStart||a.createdAt||''))).slice(0,V75_REPORT_LIMIT);
  S.meta=S.meta||{};S.meta.schemaVersion=V75_SCHEMA;
  localStorage.setItem(K,JSON.stringify(S));window.S=S;
}
function v75Settings(){v75EnsureState();return S.settingsV7.notificationV75}
function v75SaveSettings(patch={}){Object.assign(v75Settings(),patch,{updatedAt:v75Now()});save()}
function v75Permission(){return !('Notification'in window)?'unsupported':Notification.permission}
function v75PermissionFa(){const p=v75Permission();return p==='granted'?'فعال':p==='denied'?'مسدود':p==='default'?'در انتظار اجازه':'پشتیبانی نمی‌شود'}
function v75SpeechSupported(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition)}

function v75BuildUi(){
  if(!document.getElementById('v75QuickDialog'))document.body.insertAdjacentHTML('beforeend',`
  <dialog id="v75QuickDialog"><form id="v75QuickForm"><div class="dlgHead"><div><h3>ثبت سریع</h3><p class="muted">عنوان را بنویس یا با صدای فارسی ثبت کن؛ بدون سؤال اضافه وارد Inbox می‌شود.</p></div><button type="button" onclick="v75CloseQuick()">×</button></div>
  <div class="v75QuickModes"><button type="button" class="active" id="v75QuickInboxMode">📥 Inbox</button><button type="button" onclick="v75QuickFullTask()">✅ فعالیت کامل</button><button type="button" onclick="v75QuickMoney('income')">💳 درآمد</button><button type="button" onclick="v75QuickMoney('expense')">🧾 هزینه</button></div>
  <label>موضوع<textarea id="v75QuickText" rows="4" placeholder="مثلاً: پیگیری مدارک Global Talent"></textarea></label>
  <div class="v75VoiceBar"><button type="button" id="v75VoiceBtn" onclick="v75ToggleVoice()">🎙️ شروع ثبت صوتی فارسی</button><button type="button" onclick="v75FocusForDictation()">⌨️ دیکته صفحه‌کلید</button><span id="v75VoiceStatus">${v75SpeechSupported()?'آماده ثبت صدا':'تشخیص صوت مستقیم در این مرورگر فعال نیست.'}</span></div>
  <footer><span></span><button type="button" onclick="v75CloseQuick()">انصراف</button><button class="primary">ذخیره در Inbox</button></footer></form></dialog>`);
  if(!document.getElementById('v75Fab'))document.body.insertAdjacentHTML('beforeend',`<button id="v75Fab" class="v75Fab" title="ثبت سریع" aria-label="ثبت سریع" onclick="v75OpenQuick()"><span>＋</span><small>ثبت سریع</small></button>`);
  const form=document.getElementById('v75QuickForm');if(form&&!form.dataset.bound){form.dataset.bound='1';form.onsubmit=e=>{e.preventDefault();v75SaveQuick()}}
}
function v75OpenQuick(){v75BuildUi();const d=document.getElementById('v75QuickDialog');if(!d.open)d.showModal();setTimeout(()=>document.getElementById('v75QuickText')?.focus(),80)}
function v75CloseQuick(){v75StopVoice();document.getElementById('v75QuickDialog')?.close()}
function v75QuickFullTask(){v75CloseQuick();openDlg(null,sel)}
function v75QuickMoney(type){v75CloseQuick();if(typeof v74OpenTransaction==='function')v74OpenTransaction(type)}
function v75FocusForDictation(){const t=document.getElementById('v75QuickText');t?.focus();const s=document.getElementById('v75VoiceStatus');if(s)s.textContent='از دکمه میکروفون صفحه‌کلید آیفون یا لپ‌تاپ استفاده کن.'}
function v75SaveQuick(){
  const text=document.getElementById('v75QuickText')?.value.trim();if(!text)return alert('موضوع را وارد کن.');
  const now=v75Now();S.inbox.unshift({id:id(),title:text,note:'',priority:'متوسط',createdAt:now,updatedAt:now,status:'باز',source:v75UsedVoice?'voice':'quick'});
  save();document.getElementById('v75QuickText').value='';v75VoiceBase='';v75UsedVoice=false;v75CloseQuick();if(view==='inbox')render();
}
window.v75OpenQuick=v75OpenQuick;window.v75CloseQuick=v75CloseQuick;window.v75QuickFullTask=v75QuickFullTask;window.v75QuickMoney=v75QuickMoney;window.v75FocusForDictation=v75FocusForDictation;

function v75ToggleVoice(){v75VoiceActive?v75StopVoice():v75StartVoice()}
function v75StartVoice(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){v75FocusForDictation();return}
  try{
    v75Recognition=new SR();v75Recognition.lang='fa-IR';v75UsedVoice=true;v75Recognition.interimResults=true;v75Recognition.continuous=true;v75VoiceActive=true;
    const area=document.getElementById('v75QuickText');v75VoiceBase=area?.value.trim()||'';let finalText='';
    const status=document.getElementById('v75VoiceStatus'),btn=document.getElementById('v75VoiceBtn');if(status)status.textContent='در حال شنیدن… واضح و طبیعی صحبت کن.';if(btn){btn.textContent='⏹ توقف ثبت صوتی';btn.classList.add('recording')}
    v75Recognition.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const tr=e.results[i][0].transcript;if(e.results[i].isFinal)finalText+=' '+tr;else interim+=tr}if(area)area.value=[v75VoiceBase,finalText.trim(),interim.trim()].filter(Boolean).join(' ').replace(/\s+/g,' ').trim()};
    v75Recognition.onerror=e=>{if(status)status.textContent=e.error==='not-allowed'?'اجازه میکروفون داده نشد. از دیکته صفحه‌کلید استفاده کن.':'ثبت صوتی متوقف شد: '+e.error;v75StopVoice(false)};
    v75Recognition.onend=()=>{if(v75VoiceActive){v75VoiceActive=false;v75ResetVoiceButton('ثبت صوتی پایان یافت؛ متن را بررسی کن.')}};
    v75Recognition.start();
  }catch(e){v75VoiceActive=false;v75ResetVoiceButton('ثبت صوتی شروع نشد. از دیکته صفحه‌کلید استفاده کن.')}
}
function v75ResetVoiceButton(message='آماده ثبت صدا'){const btn=document.getElementById('v75VoiceBtn'),status=document.getElementById('v75VoiceStatus');if(btn){btn.textContent='🎙️ شروع ثبت صوتی فارسی';btn.classList.remove('recording')}if(status)status.textContent=message}
function v75StopVoice(reset=true){try{v75Recognition?.stop()}catch(_){}v75VoiceActive=false;v75Recognition=null;if(reset)v75ResetVoiceButton('ثبت صوتی پایان یافت؛ متن را بررسی کن.')}
window.v75ToggleVoice=v75ToggleVoice;

function v75Log(channel,type,title,body,dedupeKey,status='sent',extra={}){
  const now=v75Now();const row={id:v75Uid('notice'),channel,type,title,body,dedupeKey,status,sentAt:status==='sent'?now:'',createdAt:now,updatedAt:now,...extra};
  S.notifications.unshift(row);S.notifications=S.notifications.slice(0,V75_NOTIFICATION_LIMIT);save();return row;
}
function v75HasSent(channel,key){return (S.notifications||[]).some(n=>n.channel===channel&&n.dedupeKey===key&&n.status==='sent')}
async function v75ShowBrowser(title,body,{key,type='general',url='./',force=false}={}){
  const s=v75Settings();if(!force&&(!s.enabled||!s.browserEnabled||v75IsQuiet()))return false;if(v75Permission()!=='granted')return false;
  const dedupeKey=key||`${type}:${todayJ()}:${v75Hash(title+body)}`;if(v75HasSent('browser',dedupeKey))return false;
  try{
    const options={body,icon:'icons/icon-192.png',badge:'icons/icon-192.png',lang:'fa',dir:'rtl',tag:dedupeKey,renotify:false,data:{url}};
    if('serviceWorker'in navigator){let reg=null;try{reg=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('service worker timeout')),3500))])}catch(_){}if(reg?.showNotification)await reg.showNotification(title,options);else new Notification(title,options)}else new Notification(title,options);
    v75Log('browser',type,title,body,dedupeKey,'sent',{url});return true;
  }catch(e){v75Log('browser',type,title,body,dedupeKey,'failed',{error:String(e.message||e),url});return false}
}
async function v75RequestPermission(){
  if(!('Notification'in window))return alert('اعلان مرورگر در این مرورگر پشتیبانی نمی‌شود.');
  try{const p=await Notification.requestPermission();v75SaveSettings({browserEnabled:p==='granted',enabled:p==='granted'||v75Settings().enabled});alert(p==='granted'?'اعلان مرورگر فعال شد.':'اجازه اعلان داده نشد.');v75AutomationView()}catch(e){alert('فعال‌سازی اعلان ممکن نشد: '+(e.message||e))}
}
window.v75RequestPermission=v75RequestPermission;

function v75TaskEvents(){
  const now=new Date(),cur=v75NowMinutes(),out=[];
  (S.tasks||[]).filter(t=>t.jDate===todayJ()&&t.start&&t.reminder!=='off'&&!done(t)&&!canc(t)).forEach(t=>{
    const at=v75Minutes(t.start)-v75Num(t.reminder);const delta=cur-at;if(delta>=0&&delta<=20)out.push({type:'task',title:'یادآور کار',body:`${t.title} — ساعت ${fa(t.start)}`,key:`task:${t.id}:${t.jDate}:${t.start}:${t.reminder}`,url:'./?view=daily'});
  });return out;
}
function v75InstallmentEvents(){const tomorrow=addDays(todayJ(),1);return (S.installments||[]).filter(i=>i.status!=='paid'&&i.dueDate===tomorrow).map(i=>({type:'installment',title:'قسط فردا',body:`${v74Loan?.(i.loanId)?.title||'وام'} — ${v74Money?.(i.amount)||i.amount+' تومان'}`,key:`installment:${i.id}:${i.dueDate}`,url:'./?view=loansV7'}))}
function v75GoalEvents(){return (S.goalsV7||[]).filter(g=>['active','focus90'].includes(g.status)&&g.due&&v72GoalProgress(g)<100&&v72DateDiff(todayJ(),g.due)>=0&&v72DateDiff(todayJ(),g.due)<=3).map(g=>({type:'goal',title:'هدف نزدیک به مهلت',body:`${g.title} — ${fa(v72DateDiff(todayJ(),g.due))} روز مانده`,key:`goal:${g.id}:${todayJ()}`,url:'./?view=goalsV7'}))}
function v75SystemEvents(){return (S.systems||[]).filter(s=>s.active!==false&&s.nextRunDate&&s.nextRunDate<=todayJ()&&!v72ActiveRun(s.id)).map(s=>({type:'system',title:'سیستم موعد اجرا دارد',body:s.name,key:`system:${s.id}:${todayJ()}`,url:'./?view=systemsV7'}))}
function v75DailyDigest(){
  const tasks=dayTasks(todayJ()).filter(t=>!done(t)&&!canc(t)).sort((a,b)=>v73TaskWeight(b)-v73TaskWeight(a)||(a.start||'99:99').localeCompare(b.start||'99:99'));
  const systems=(S.systems||[]).filter(s=>s.active!==false&&s.nextRunDate&&s.nextRunDate<=todayJ()).length;
  const alerts=v73Alerts().filter(a=>a.level==='red').length;
  const top=tasks.slice(0,3).map(t=>t.title).join('، ')||'کار ثبت‌شده‌ای وجود ندارد';
  const forecast=typeof v74Forecast==='function'?v74Forecast(30).forecast:null;
  return {title:'خلاصه مدیریتی امروز',body:`${fa(tasks.length)} کار فعال؛ ${fa(systems)} سیستم موعددار؛ ${fa(alerts)} هشدار بحرانی. اولویت‌ها: ${top}${forecast!=null?`؛ مانده ۳۰روزه: ${v74SignedMoney(forecast)}`:''}`,text:`📊 خلاصه امروز ${fa(todayJ())}\n\nکارهای فعال: ${fa(tasks.length)}\nسیستم‌های موعددار: ${fa(systems)}\nهشدارهای بحرانی: ${fa(alerts)}\nاولویت‌ها: ${top}${forecast!=null?`\nمانده ۳۰ روز آینده: ${v74SignedMoney(forecast)}`:''}`};
}
function v75WeeklyReport(start=week(todayJ()).start,force=false){
  const id=`weekly_${start}`;let row=(S.autoReports||[]).find(r=>r.id===id);if(row&&!force)return row;
  const a=v73WeeklyAuto(start),review=S.weeklyReviews?.[start]||{},score=v73LevelUpScore(),red=v73Alerts().filter(x=>x.level==='red').length,fin=typeof v74Forecast==='function'?v74Forecast(30).forecast:null;
  const text=[`📈 گزارش هفتگی Planner Life for Soil`,`هفته ${fa(start)} تا ${fa(a.end)}`,'',`تحقق کارها: ${fa(a.completion)}٪`,`انجام‌شده: ${fa(a.done)}`,`عقب‌افتاده: ${fa(a.late)}`,`اجرای سیستم‌ها: ${fa(a.systemCompleted)} از ${fa(a.systemRuns)}`,`پیشرفت اهداف ۹۰روزه: ${fa(a.focus)}٪`,`انرژی میانگین: ${a.energy?fa(a.energy)+'/۵':'ثبت نشده'}`,`LEVEL UP: ${fa(score)}٪`,`هشدار بحرانی: ${fa(red)}`,fin!=null?`مانده پیش‌بینی‌شده ۳۰روزه: ${v74SignedMoney(fin)}`:'',review.wins?`بردهای هفته: ${review.wins}`:'',review.keyDecision?`تصمیم هفته آینده: ${review.keyDecision}`:''].filter(Boolean).join('\n');
  const now=v75Now();const next={id,type:'weekly',title:`گزارش هفتگی ${fa(start)}`,weekStart:start,weekEnd:a.end,metrics:{...a,levelUp:score,critical:red,finance30:fin},text,createdAt:row?.createdAt||now,updatedAt:now};
  if(row)Object.assign(row,next);else S.autoReports.unshift(next);S.autoReports=S.autoReports.slice(0,V75_REPORT_LIMIT);save();return next;
}
function v75ReportHtml(r){if(!r)return '<div class="empty">هنوز گزارشی ساخته نشده است.</div>';const m=r.metrics||{};return `<article class="v75ReportCard"><div class="v75ReportTop"><div><b>${esc(r.title)}</b><small>${fa(r.weekStart)} تا ${fa(r.weekEnd)}</small></div><span style="--p:${v75Num(m.completion)}">${fa(m.completion||0)}٪</span></div><div class="v75ReportMetrics"><span>انجام‌شده <b>${fa(m.done||0)}</b></span><span>عقب‌افتاده <b>${fa(m.late||0)}</b></span><span>سیستم <b>${fa(m.systemCompleted||0)}/${fa(m.systemRuns||0)}</b></span><span>LEVEL UP <b>${fa(m.levelUp||0)}٪</b></span></div><div class="v75ReportActions"><button onclick="v75CopyReport('${r.id}')">کپی متن</button><button onclick="v75SendReportBrowser('${r.id}')">اعلان مرورگر</button><button onclick="v75SendReportTelegram('${r.id}')" class="primary">ارسال تلگرام</button></div></article>`}
function v75GenerateCurrentReport(){const r=v75WeeklyReport(week(todayJ()).start,true);alert('گزارش هفتگی به‌روزرسانی شد.');if(view==='automationV7'||view==='reportsV7')render();return r}
function v75CopyReport(id){const r=S.autoReports.find(x=>x.id===id);if(!r)return;navigator.clipboard?.writeText(r.text).then(()=>alert('متن گزارش کپی شد.')).catch(()=>prompt('متن گزارش:',r.text))}
async function v75SendReportBrowser(id){const r=S.autoReports.find(x=>x.id===id);if(!r)return;await v75ShowBrowser(r.title,`تحقق ${fa(r.metrics?.completion||0)}٪؛ LEVEL UP ${fa(r.metrics?.levelUp||0)}٪`,{key:`report:${id}:manual:${Date.now()}`,type:'weekly',force:true,url:'./?view=reportsV7'})}
window.v75GenerateCurrentReport=v75GenerateCurrentReport;window.v75CopyReport=v75CopyReport;window.v75SendReportBrowser=v75SendReportBrowser;

async function v75SendTelegram(text,{key='',type='manual',silent=false}={}){
  const s=v75Settings();
  if(!s.telegramEnabled&&!silent)throw new Error('ابتدا تلگرام را از صفحه اعلان و اتوماسیون فعال کن.');
  if(!s.telegramChatId)throw new Error('Chat ID تلگرام ثبت نشده است.');
  if(!cloud?.client||!cloud?.user)throw new Error('برای ارسال تلگرام باید وارد حساب ابری باشی.');

  const {data:sessionData,error:sessionError}=await cloud.client.auth.getSession();
  const accessToken=sessionData?.session?.access_token;
  if(sessionError||!accessToken)throw new Error('نشست ابری معتبر نیست. از حساب ابری خارج شو و دوباره وارد شو.');

  const dedupeKey=key||`telegram:${type}:${todayJ()}:${v75Hash(text)}`;
  if(key&&v75HasSent('telegram',dedupeKey))return {skipped:true};

  const fn=s.telegramFunctionName||'planner-telegram';
  const {data,error}=await cloud.client.functions.invoke(fn,{
    headers:{Authorization:`Bearer ${accessToken}`},
    body:{chatId:String(s.telegramChatId).trim(),text:v75TelegramText(text),kind:type}
  });

  if(error){
    let detail=error.message||'Edge Function خطا برگرداند.';
    try{
      if(error.context&&typeof error.context.clone==='function'){
        const payload=await error.context.clone().json();
        detail=payload?.error||payload?.message||detail;
      }
    }catch(_){ }
    throw new Error(detail);
  }
  if(data?.ok===false)throw new Error(data.error||'ارسال تلگرام ناموفق بود.');

  v75Log('telegram',type,'ارسال تلگرام',String(text).slice(0,240),dedupeKey,'sent');
  return data||{ok:true};
}
async function v75TestTelegram(){const btn=document.getElementById('v75TelegramTest');if(btn)btn.disabled=true;try{await v75SendTelegram(`✅ اتصال Planner Life for Soil 7.6 با موفقیت برقرار شد.\n${fa(todayJ())}`,{type:'test'});alert('پیام آزمایشی ارسال شد.')}catch(e){alert('ارسال ناموفق: '+(e.message||e))}finally{if(btn)btn.disabled=false}}
async function v75SendDailyTelegram(){try{await v75SendTelegram(v75DailyDigest().text,{type:'daily',key:`daily:${todayJ()}:manual:${Date.now()}`});alert('خلاصه امروز ارسال شد.')}catch(e){alert('ارسال ناموفق: '+(e.message||e))}}
async function v75SendReportTelegram(id){const r=S.autoReports.find(x=>x.id===id);if(!r)return;try{await v75SendTelegram(r.text,{type:'weekly',key:`weekly:${r.weekStart}:manual:${Date.now()}`});alert('گزارش هفتگی ارسال شد.')}catch(e){alert('ارسال ناموفق: '+(e.message||e))}}
window.v75TestTelegram=v75TestTelegram;window.v75SendDailyTelegram=v75SendDailyTelegram;window.v75SendReportTelegram=v75SendReportTelegram;

async function v75CheckNotifications(manual=false){
  if(v75Checking)return;v75Checking=true;try{
    const s=v75Settings();if(!s.enabled&&!manual)return;
    const events=[];if(s.taskAlerts)events.push(...v75TaskEvents());if(s.installmentAlerts)events.push(...v75InstallmentEvents());if(s.goalAlerts)events.push(...v75GoalEvents());if(s.systemAlerts)events.push(...v75SystemEvents());
    for(const e of events)await v75ShowBrowser(e.title,e.body,{key:e.key,type:e.type,url:e.url,force:manual});
    if(s.dailyDigest&&v75IsAtOrAfter(s.dailyDigestTime)){const d=v75DailyDigest();await v75ShowBrowser(d.title,d.body,{key:`daily:${todayJ()}`,type:'daily',url:'./?view=dashboard',force:manual});if(s.telegramEnabled&&s.telegramDailyDigest&&!v75HasSent('telegram',`daily:${todayJ()}`)){try{await v75SendTelegram(d.text,{key:`daily:${todayJ()}`,type:'daily'})}catch(_){}}}
    if(s.weeklyReport&&v75WeekdayIndex()===6&&v75IsAtOrAfter(s.weeklyReportTime)){const r=v75WeeklyReport(week(todayJ()).start,true);await v75ShowBrowser('گزارش هفتگی آماده است',`تحقق کارها ${fa(r.metrics.completion)}٪؛ LEVEL UP ${fa(r.metrics.levelUp)}٪`,{key:`weekly:${r.weekStart}`,type:'weekly',url:'./?view=reportsV7',force:manual});if(s.telegramEnabled&&s.telegramWeeklyReport&&!v75HasSent('telegram',`weekly:${r.weekStart}`)){try{await v75SendTelegram(r.text,{key:`weekly:${r.weekStart}`,type:'weekly'})}catch(_){}}}
    if(s.telegramEnabled&&s.telegramCriticalAlerts){for(const a of v73Alerts().filter(x=>x.level==='red').slice(0,5)){const key=`critical:${todayJ()}:${v75Hash(a.title+a.detail)}`;if(!v75HasSent('telegram',key)){try{await v75SendTelegram(`🔴 ${a.title}\n${a.detail}`,{key,type:'critical'})}catch(_){break}}}}
    if(manual)alert('بررسی اعلان‌ها انجام شد.');
  }finally{v75Checking=false}
}
window.v75CheckNotifications=v75CheckNotifications;

function v75NotificationLogHtml(){const rows=(S.notifications||[]).slice(0,20);if(!rows.length)return '<div class="empty">هنوز اعلانی ثبت نشده است.</div>';return `<div class="v75LogList">${rows.map(n=>`<article><span class="${n.status==='sent'?'ok':'bad'}">${n.channel==='telegram'?'✈️':'🔔'}</span><div><b>${esc(n.title)}</b><small>${esc(n.body||'')} · ${fa((n.sentAt||n.createdAt||'').replace('T',' ').slice(0,16))}</small></div><em>${n.status==='sent'?'ارسال‌شده':'ناموفق'}</em></article>`).join('')}</div>`}
function v75AutoReportsHtml(){const rows=(S.autoReports||[]).slice(0,6);return rows.length?`<div class="v75ReportsList">${rows.map(v75ReportHtml).join('')}</div>`:'<div class="empty">با دکمه «ساخت گزارش این هفته» نخستین گزارش را ایجاد کن.</div>'}

function v75AutomationView(){
  const s=v75Settings(),permission=v75PermissionFa();
  document.getElementById('app').innerHTML=`
  <section class="card v75Hero"><div><small>اعلان و اتوماسیون</small><h3>مرکز هوشمند یادآوری و گزارش</h3><p>اعلان مرورگر، خلاصه روزانه، گزارش جمعه و اتصال امن به ربات خصوصی تلگرام.</p></div><div><button onclick="v75CheckNotifications(true)">بررسی اکنون</button><button onclick="v75OpenQuick()" class="primary">+ ثبت سریع</button></div></section>
  <section class="grid dash"><div class="card c6"><div class="v75SectionHead"><div><h3>اعلان مرورگر</h3><p class="muted">وضعیت اجازه: <b>${permission}</b></p></div><button onclick="v75RequestPermission()" class="primary">فعال‌سازی اعلان</button></div><form id="v75SettingsForm" class="v75SettingsGrid">
  <label class="v75Switch"><input id="v75Enabled" type="checkbox" ${s.enabled?'checked':''}><span>فعال‌بودن مرکز اعلان</span></label><label class="v75Switch"><input id="v75BrowserEnabled" type="checkbox" ${s.browserEnabled?'checked':''}><span>ارسال اعلان مرورگر</span></label>
  <label class="v75Switch"><input id="v75TaskAlerts" type="checkbox" ${s.taskAlerts?'checked':''}><span>کارهای دارای یادآور</span></label><label class="v75Switch"><input id="v75InstallmentAlerts" type="checkbox" ${s.installmentAlerts?'checked':''}><span>قسط یک روز قبل</span></label>
  <label class="v75Switch"><input id="v75GoalAlerts" type="checkbox" ${s.goalAlerts?'checked':''}><span>هدف نزدیک به مهلت</span></label><label class="v75Switch"><input id="v75SystemAlerts" type="checkbox" ${s.systemAlerts?'checked':''}><span>سیستم موعددار</span></label>
  <label class="v75Switch"><input id="v75DailyDigest" type="checkbox" ${s.dailyDigest?'checked':''}><span>خلاصه روزانه</span></label><label>ساعت خلاصه روزانه<input id="v75DailyDigestTime" type="time" value="${esc(s.dailyDigestTime)}"></label>
  <label class="v75Switch"><input id="v75WeeklyReport" type="checkbox" ${s.weeklyReport?'checked':''}><span>گزارش خودکار جمعه</span></label><label>ساعت گزارش جمعه<input id="v75WeeklyReportTime" type="time" value="${esc(s.weeklyReportTime)}"></label>
  <label>شروع سکوت<input id="v75QuietFrom" type="time" value="${esc(s.quietFrom)}"></label><label>پایان سکوت<input id="v75QuietTo" type="time" value="${esc(s.quietTo)}"></label>
  <button class="primary wide">ذخیره تنظیمات اعلان</button></form><p class="v75Note">اعلان محلی زمانی بررسی می‌شود که برنامه یا PWA باز شده باشد. روی آیفون، برای اعلان مرورگر بهتر است برنامه را به Home Screen اضافه کنی.</p></div>
  <div class="card c6"><div class="v75SectionHead"><div><h3>ربات خصوصی تلگرام</h3><p class="muted">توکن ربات هرگز داخل GitHub یا مرورگر ذخیره نمی‌شود.</p></div><span class="badge ${s.telegramEnabled?'ok':''}">${s.telegramEnabled?'فعال':'غیرفعال'}</span></div><div class="v75TelegramGrid">
  <label class="v75Switch wide"><input id="v75TelegramEnabled" type="checkbox" ${s.telegramEnabled?'checked':''}><span>فعال‌سازی اتصال تلگرام</span></label>
  <label>Telegram Chat ID<input id="v75TelegramChatId" inputmode="numeric" value="${esc(s.telegramChatId)}" placeholder="مثلاً 123456789"></label><label>نام Edge Function<input id="v75TelegramFunction" value="${esc(s.telegramFunctionName)}"></label>
  <label class="v75Switch"><input id="v75TelegramDaily" type="checkbox" ${s.telegramDailyDigest?'checked':''}><span>خلاصه روزانه تلگرام</span></label><label class="v75Switch"><input id="v75TelegramWeekly" type="checkbox" ${s.telegramWeeklyReport?'checked':''}><span>گزارش هفتگی تلگرام</span></label>
  <label class="v75Switch wide"><input id="v75TelegramCritical" type="checkbox" ${s.telegramCriticalAlerts?'checked':''}><span>هشدارهای بحرانی تلگرام</span></label>
  <div class="v75TelegramActions wide"><button id="v75TelegramTest" type="button" onclick="v75SaveTelegramSettings(false);v75TestTelegram()">ارسال پیام آزمایشی</button><button type="button" onclick="v75SaveTelegramSettings(false);v75SendDailyTelegram()">ارسال خلاصه امروز</button><button type="button" class="primary" onclick="v75SaveTelegramSettings(true)">ذخیره تنظیمات تلگرام</button></div></div><p class="v75Note">برای فعال‌شدن ارسال، فایل Edge Function همراه بسته را یک‌بار در Supabase مستقر و توکن ربات را به‌عنوان Secret ثبت کن.</p></div></section>
  <section class="grid dash"><div class="card c7"><div class="v75SectionHead"><div><h3>گزارش‌های خودکار</h3><p class="muted">گزارش هفتگی از کارها، سیستم‌ها، اهداف، LEVEL UP و وضعیت مالی ساخته می‌شود.</p></div><button onclick="v75GenerateCurrentReport()" class="primary">ساخت گزارش این هفته</button></div>${v75AutoReportsHtml()}</div><div class="card c5"><h3>ثبت سریع و صوت فارسی</h3><div class="v75QuickFeature"><span>🎙️</span><div><b>${v75SpeechSupported()?'تشخیص صوت فارسی آماده است':'مسیر دیکته صفحه‌کلید فعال است'}</b><p>با دکمه شناور پایین صفحه، موضوع را مستقیم به Inbox بفرست.</p></div></div><button onclick="v75OpenQuick()" class="primary">بازکردن ثبت سریع</button><p class="v75Note">میانبر لپ‌تاپ: Ctrl + K یا ⌘ + K</p></div></section>
  <section class="card"><div class="v75SectionHead"><div><h3>تاریخچه اعلان‌ها</h3><p class="muted">۲۰ اعلان اخیر مرورگر و تلگرام</p></div><button onclick="v75ClearLogs()">پاک‌کردن تاریخچه</button></div>${v75NotificationLogHtml()}</section>`;
  const form=document.getElementById('v75SettingsForm');if(form)form.onsubmit=e=>{e.preventDefault();v75SaveNotificationForm()};
}
function v75SaveNotificationForm(){v75SaveSettings({enabled:document.getElementById('v75Enabled').checked,browserEnabled:document.getElementById('v75BrowserEnabled').checked,taskAlerts:document.getElementById('v75TaskAlerts').checked,installmentAlerts:document.getElementById('v75InstallmentAlerts').checked,goalAlerts:document.getElementById('v75GoalAlerts').checked,systemAlerts:document.getElementById('v75SystemAlerts').checked,dailyDigest:document.getElementById('v75DailyDigest').checked,dailyDigestTime:document.getElementById('v75DailyDigestTime').value||'08:00',weeklyReport:document.getElementById('v75WeeklyReport').checked,weeklyReportTime:document.getElementById('v75WeeklyReportTime').value||'18:00',quietFrom:document.getElementById('v75QuietFrom').value||'22:30',quietTo:document.getElementById('v75QuietTo').value||'07:00'});alert('تنظیمات اعلان ذخیره شد.');v75AutomationView()}
function v75SaveTelegramSettings(show=true){v75SaveSettings({telegramEnabled:document.getElementById('v75TelegramEnabled')?.checked||false,telegramChatId:document.getElementById('v75TelegramChatId')?.value.trim()||'',telegramFunctionName:document.getElementById('v75TelegramFunction')?.value.trim()||'planner-telegram',telegramDailyDigest:document.getElementById('v75TelegramDaily')?.checked||false,telegramWeeklyReport:document.getElementById('v75TelegramWeekly')?.checked!==false,telegramCriticalAlerts:document.getElementById('v75TelegramCritical')?.checked!==false});if(show){alert('تنظیمات تلگرام ذخیره شد.');v75AutomationView()}}
function v75ClearLogs(){if(!confirm('تاریخچه اعلان‌ها پاک شود؟'))return;(S.notifications||[]).forEach(n=>v7MarkDeleted?.('notifications',n.id));S.notifications=[];save();v75AutomationView()}
window.v75SaveNotificationForm=v75SaveNotificationForm;window.v75SaveTelegramSettings=v75SaveTelegramSettings;window.v75ClearLogs=v75ClearLogs;

// افزودن گزارش خودکار به صفحه گزارش‌ها
const v75ReportsBase=v73ReportsView;
v73ReportsView=function(){v75ReportsBase();const app=document.getElementById('app');if(app)app.insertAdjacentHTML('beforeend',`<section class="card v75ReportsSection"><div class="v75SectionHead"><div><h3>گزارش‌های خودکار هفتگی</h3><p class="muted">قابل کپی، اعلان مرورگر و ارسال امن به تلگرام</p></div><button onclick="v75GenerateCurrentReport()" class="primary">ساخت گزارش جاری</button></div>${v75AutoReportsHtml()}</section>`)};
window.v73ReportsView=v73ReportsView;

// ساخت گزارش بلافاصله پس از ذخیره مرور هفتگی
const v75WeeklySaveBase=v73SaveWeeklyReview;
v73SaveWeeklyReview=function(){const start=document.getElementById('v73WeeklyReviewKey')?.value||week(todayJ()).start;v75WeeklySaveBase();setTimeout(()=>v75WeeklyReport(start,true),40)};
window.v73SaveWeeklyReview=v73SaveWeeklyReview;

// منو و رندر
if(!C.nav.some(n=>n[0]==='automationV7')){
  const idx=C.nav.findIndex(n=>n[0]==='reportsV7');C.nav.splice(idx<0?C.nav.length:idx,0,['automationV7','🔔','اعلان و اتوماسیون','اعلان، ثبت صوتی و گزارش خودکار']);
}
const v75RenderBase=render;
render=function(){if(view==='automationV7'){v75AutomationView();return}return v75RenderBase()};window.render=render;

function v75ApplyQueryView(){try{const q=new URLSearchParams(location.search).get('view');if(q&&C.nav.some(n=>n[0]===q)){view=q;const item=C.nav.find(n=>n[0]===q);if(item)document.getElementById('pageTitle').textContent=item[3]}}catch(_){}}
function v75BindGlobal(){
  v75BuildUi();document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==='k'){e.preventDefault();v75OpenQuick()}});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')v75CheckNotifications(false)});window.addEventListener('focus',()=>v75CheckNotifications(false));
  clearInterval(v75CheckTimer);v75CheckTimer=setInterval(()=>v75CheckNotifications(false),V75_CHECK_INTERVAL);
}
function v75Init(){
  v75EnsureState();v75BuildUi();v75ApplyQueryView();
  const title=document.querySelector('title');if(title)title.textContent='Planner Life for Soil 7.6';const label=document.getElementById('calendarLabel');if(label)label.textContent='Planner Life for Soil 7.6 · اعلان، صوت و اتوماسیون';
  buildNav();render();v75BindGlobal();setTimeout(()=>v75CheckNotifications(false),1800);
}
v75Init();
