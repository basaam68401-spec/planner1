'use strict';

// ===== Planner for Best Life — افزونه سازگار با نسخه 7.9 =====
const BEST_LIFE_SCHEMA='planner-for-best-life-v7.9';
let bestLifeTicker=null;

function bestLifeEnsureState(){
  S.meta=S.meta||{};
  S.meta.bestLifeSchema=BEST_LIFE_SCHEMA;
  S.goalTimers=S.goalTimers||{};
  S.goalTimers.items=Array.isArray(S.goalTimers.items)?S.goalTimers.items:[];
  S.goalTimers.logs=S.goalTimers.logs&&typeof S.goalTimers.logs==='object'?S.goalTimers.logs:{};
  S.goalTimers.active=S.goalTimers.active&&typeof S.goalTimers.active==='object'?S.goalTimers.active:null;
  S.goalTimers.items=S.goalTimers.items.map(item=>({
    id:item.id||id(),
    title:String(item.title||'هدف بدون عنوان'),
    kind:item.kind==='project'?'project':'goal',
    dailySeconds:Math.max(60,Number(item.dailySeconds)||Number(item.dailyMinutes)*60||3600),
    active:item.active!==false,
    createdAt:item.createdAt||new Date().toISOString(),
    updatedAt:item.updatedAt||item.createdAt||new Date().toISOString()
  }));
  if(S.goalTimers.active&&!S.goalTimers.items.some(item=>item.id===S.goalTimers.active.goalId))S.goalTimers.active=null;
  localStorage.setItem(K,JSON.stringify(S));
  window.S=S;
}

function bestLifeItem(goalId){return S.goalTimers.items.find(item=>item.id===goalId)}
function bestLifeDateLog(date,create=true){
  if(create)S.goalTimers.logs[date]=S.goalTimers.logs[date]||{};
  return S.goalTimers.logs[date]||{};
}
function bestLifeGoalLog(date,goalId,create=true){
  const day=bestLifeDateLog(date,create);
  if(create)day[goalId]=day[goalId]||{seconds:0,sessions:[]};
  return day[goalId]||{seconds:0,sessions:[]};
}
function bestLifeRunningSeconds(goalId,date){
  const active=S.goalTimers.active;
  if(!active||active.goalId!==goalId||active.date!==date)return 0;
  return Math.max(0,Math.floor((Date.now()-Number(active.startedAt||Date.now()))/1000));
}
function bestLifeElapsed(goalId,date){
  return Math.max(0,Number(bestLifeGoalLog(date,goalId,false).seconds)||0)+bestLifeRunningSeconds(goalId,date);
}
function bestLifeProgress(item,date){return Math.min(100,Math.round(bestLifeElapsed(item.id,date)/Math.max(60,item.dailySeconds)*100))}
function bestLifeColor(progress){
  const p=Math.max(0,Math.min(100,Number(progress)||0));
  const hue=Math.round(40+(132-40)*(p/100));
  const light=Math.round(58-(p/100)*12);
  return `hsl(${hue} 66% ${light}%)`;
}
function bestLifeClock(totalSeconds){
  const value=Math.max(0,Math.floor(Number(totalSeconds)||0));
  const h=Math.floor(value/3600),m=Math.floor(value%3600/60),s=value%60;
  return fa([h,m,s].map(x=>String(x).padStart(2,'0')).join(':'));
}
function bestLifeDuration(totalSeconds){
  const value=Math.max(0,Math.round(Number(totalSeconds)||0));
  const h=Math.floor(value/3600),m=Math.round(value%3600/60),parts=[];
  if(h)parts.push(`${fa(h)} ساعت`);
  if(m)parts.push(`${fa(m)} دقیقه`);
  return parts.join(' و ')||'کمتر از یک دقیقه';
}

function bestLifeStopTimer(goalId,completed=false,silent=false){
  const active=S.goalTimers.active;
  if(!active||active.goalId!==goalId)return;
  const item=bestLifeItem(goalId),log=bestLifeGoalLog(active.date,goalId,true);
  const now=Date.now(),started=Number(active.startedAt)||now,sessionSeconds=Math.max(0,Math.floor((now-started)/1000));
  const maxSeconds=item?item.dailySeconds:Number.MAX_SAFE_INTEGER;
  const room=Math.max(0,maxSeconds-(Number(log.seconds)||0));
  const credited=completed?room:Math.min(room,sessionSeconds);
  log.seconds=Math.min(maxSeconds,(Number(log.seconds)||0)+credited);
  log.sessions=Array.isArray(log.sessions)?log.sessions:[];
  if(credited>0)log.sessions.push({startedAt:new Date(started).toISOString(),endedAt:new Date(now).toISOString(),seconds:credited});
  S.goalTimers.active=null;
  save();
  if(!silent)bestLifeRefreshDailyPanel();
}
function bestLifeToggleTimer(goalId,date=sel){
  bestLifeEnsureState();
  const item=bestLifeItem(goalId);if(!item||item.active===false)return;
  const active=S.goalTimers.active;
  if(active&&active.goalId===goalId&&active.date===date){bestLifeStopTimer(goalId);return}
  if(active)bestLifeStopTimer(active.goalId,false,true);
  if(bestLifeElapsed(goalId,date)>=item.dailySeconds){bestLifeRefreshDailyPanel();return}
  S.goalTimers.active={goalId,date,startedAt:Date.now()};
  save();bestLifeStartTicker();bestLifeRefreshDailyPanel();
}
function bestLifeStartTicker(){
  if(bestLifeTicker)return;
  bestLifeTicker=setInterval(bestLifeTick,1000);
}
function bestLifeTick(){
  const active=S.goalTimers.active;
  if(active){
    const item=bestLifeItem(active.goalId);
    if(!item){S.goalTimers.active=null;save()}
    else if(bestLifeElapsed(item.id,active.date)>=item.dailySeconds){bestLifeStopTimer(item.id,true);return}
  }
  document.querySelectorAll('[data-best-life-goal]').forEach(segment=>{
    const item=bestLifeItem(segment.dataset.bestLifeGoal),date=segment.dataset.date;
    if(!item)return;
    const elapsed=bestLifeElapsed(item.id,date),progress=bestLifeProgress(item,date),color=bestLifeColor(progress);
    segment.style.setProperty('--goal-progress',`${progress}%`);
    segment.style.setProperty('--goal-color',color);
    segment.classList.toggle('is-running',S.goalTimers.active?.goalId===item.id&&S.goalTimers.active?.date===date);
    segment.classList.toggle('is-complete',progress>=100);
    const time=segment.querySelector('.bestLifeElapsed');if(time)time.textContent=bestLifeClock(elapsed);
    const percent=segment.querySelector('.bestLifePercent');if(percent)percent.textContent=fa(progress)+'٪';
    const fill=segment.querySelector('.bestLifeSegmentFill');if(fill)fill.style.width=`${progress}%`;
  });
}

function bestLifeSegment(item,date){
  const elapsed=bestLifeElapsed(item.id,date),progress=bestLifeProgress(item,date),running=S.goalTimers.active?.goalId===item.id&&S.goalTimers.active?.date===date;
  const complete=progress>=100,color=bestLifeColor(progress),kind=item.kind==='project'?'پروژه':'هدف';
  const basis=Math.max(150,Math.round(item.dailySeconds/60*2.1));
  return `<article class="bestLifeSegment ${running?'is-running':''} ${complete?'is-complete':''}" data-best-life-goal="${item.id}" data-date="${date}" style="--goal-weight:${Math.max(60,item.dailySeconds)};--goal-basis:${basis}px;--goal-progress:${progress}%;--goal-color:${color}"><i class="bestLifeSegmentFill" style="width:${progress}%"></i><div class="bestLifeSegmentBody"><div class="bestLifeSegmentTop"><span>${kind}</span><b class="bestLifePercent">${fa(progress)}٪</b></div><h4>${esc(item.title)}</h4><div class="bestLifeTimer"><strong class="bestLifeElapsed">${bestLifeClock(elapsed)}</strong><small>از ${bestLifeDuration(item.dailySeconds)}</small></div><button type="button" class="bestLifeTimerBtn ${running?'running':''}" ${complete?'disabled':''} onclick="bestLifeToggleTimer('${item.id}','${date}')" aria-label="${running?'توقف':'شروع'} تایمر ${esc(item.title)}"><span>${complete?'✓':running?'Ⅱ':'▶'}</span>${complete?'تکمیل شد':running?'توقف':'شروع'}</button></div></article>`;
}
function bestLifeDailyPanelHtml(date=sel){
  const items=S.goalTimers.items.filter(item=>item.active!==false);
  const assigned=items.reduce((sum,item)=>sum+item.dailySeconds,0),spent=items.reduce((sum,item)=>sum+Math.min(item.dailySeconds,bestLifeElapsed(item.id,date)),0);
  return `<section class="card bestLifeDailyPanel" id="bestLifeDailyPanel"><div class="bestLifePanelHead"><div><small>زمان‌گذاری مستمر برای اهداف چندروزه</small><h3>مسیر روزانه اهداف و پروژه‌ها</h3><p class="muted">هر بخش، سهم امروز یک هدف یا پروژه است؛ با پیشرفت تایمر، رنگ آن پیوسته به سبز نزدیک می‌شود.</p></div><div class="bestLifePanelStats"><span>برنامه امروز <b>${bestLifeDuration(assigned)}</b></span><span>انجام‌شده <b>${bestLifeDuration(spent)}</b></span><button type="button" onclick="bestLifeGoToGoals()">مدیریت اهداف زمان‌دار</button></div></div>${items.length?`<div class="bestLifeSegmentRail" role="group" aria-label="زمان اهداف و پروژه‌های امروز">${items.map(item=>bestLifeSegment(item,date)).join('')}</div><div class="bestLifeScale"><span>شروع</span><span>در حال پیشرفت</span><span>تکمیل روزانه</span></div>`:`<div class="empty bestLifeEmpty">هنوز هدف یا پروژهٔ زمان‌داری تعریف نشده است.<button type="button" class="primary" onclick="bestLifeGoToGoals()">تعریف اولین هدف زمان‌دار</button></div>`}</section>`;
}
function bestLifeInjectDailyPanel(){
  const app=document.getElementById('app');if(!app||document.getElementById('bestLifeDailyPanel'))return;
  const anchor=app.querySelector('.v78TimeboxingCard')||app.querySelectorAll(':scope > .card')[2];
  if(anchor)anchor.insertAdjacentHTML('beforebegin',bestLifeDailyPanelHtml(sel));
  else app.insertAdjacentHTML('beforeend',bestLifeDailyPanelHtml(sel));
  bestLifeTick();
}
function bestLifeRefreshDailyPanel(){
  const panel=document.getElementById('bestLifeDailyPanel');
  if(panel)panel.outerHTML=bestLifeDailyPanelHtml(panel.querySelector('[data-date]')?.dataset.date||sel);
  bestLifeTick();
}
function bestLifeGoToGoals(){
  view='goalsV7';
  const nav=C.nav.find(item=>item[0]===view);if(nav)document.getElementById('pageTitle').textContent=nav[3];
  buildNav();render();
  requestAnimationFrame(()=>document.getElementById('bestLifeGoalManager')?.scrollIntoView({behavior:'smooth',block:'start'}));
}

function bestLifeManagerRows(){
  if(!S.goalTimers.items.length)return '<div class="empty">برای ساخت نوار روزانه، اولین هدف یا پروژه را تعریف کن.</div>';
  return `<div class="bestLifeManagerRows">${S.goalTimers.items.map(item=>`<article class="bestLifeManagerRow ${item.active===false?'inactive':''}"><div class="bestLifeManagerIcon">${item.kind==='project'?'🧩':'🎯'}</div><div><b>${esc(item.title)}</b><small>${item.kind==='project'?'پروژه':'هدف'} · روزانه ${bestLifeDuration(item.dailySeconds)}</small></div><span class="bestLifeState">${item.active===false?'متوقف':'فعال'}</span><div class="bestLifeManagerActions"><button type="button" onclick="bestLifeEditItem('${item.id}')">ویرایش</button><button type="button" onclick="bestLifeToggleItem('${item.id}')">${item.active===false?'فعال‌سازی':'توقف نمایش'}</button><button type="button" class="danger" onclick="bestLifeDeleteItem('${item.id}')">حذف</button></div></article>`).join('')}</div>`;
}
function bestLifeManagerHtml(){
  return `<section class="card bestLifeGoalManager" id="bestLifeGoalManager"><div class="bestLifeManagerHead"><div><small>تعریف بخش‌های نوار افقی روزانه</small><h3>اهداف و پروژه‌های زمان‌دار</h3><p class="muted">برای کارهای چندروزه، زمان ثابت روزانه تعیین کن. این موارد «کار روزانه» نیستند؛ سهم روزانهٔ اهداف و پروژه‌های بلندمدت‌اند.</p></div><span>${fa(S.goalTimers.items.filter(item=>item.active!==false).length)} مورد فعال</span></div><form id="bestLifeGoalForm" class="bestLifeGoalForm"><input type="hidden" id="bestLifeItemId"><label>نوع<select id="bestLifeKind"><option value="goal">هدف</option><option value="project">پروژه</option></select></label><label class="bestLifeTitleField">عنوان<input id="bestLifeTitle" required placeholder="مثلاً تکمیل پایان‌نامه"></label><label>ساعت روزانه<input id="bestLifeHours" type="number" min="0" max="12" value="1"></label><label>دقیقه<input id="bestLifeMinutes" type="number" min="0" max="59" step="5" value="0"></label><label class="bestLifeActiveCheck"><input id="bestLifeActive" type="checkbox" checked><span>نمایش در نوار روزانه</span></label><div class="bestLifeFormActions"><button type="button" id="bestLifeCancelEdit" class="hide" onclick="bestLifeResetForm()">انصراف</button><button type="submit" class="primary" id="bestLifeSubmit">+ افزودن به نوار</button></div></form>${bestLifeManagerRows()}</section>`;
}
function bestLifeBindManager(){
  const form=document.getElementById('bestLifeGoalForm');if(!form)return;
  form.onsubmit=event=>{event.preventDefault();bestLifeSaveItem()};
}
function bestLifeInjectManager(){
  const app=document.getElementById('app');if(!app||document.getElementById('bestLifeGoalManager'))return;
  app.insertAdjacentHTML('afterbegin',bestLifeManagerHtml());bestLifeBindManager();
}
function bestLifeSaveItem(){
  const itemId=document.getElementById('bestLifeItemId').value,title=document.getElementById('bestLifeTitle').value.trim();
  const hours=Math.max(0,Number(document.getElementById('bestLifeHours').value)||0),minutes=Math.max(0,Math.min(59,Number(document.getElementById('bestLifeMinutes').value)||0));
  const dailySeconds=Math.round((hours*60+minutes)*60);
  if(!title)return alert('عنوان هدف یا پروژه را وارد کن.');
  if(dailySeconds<60)return alert('زمان روزانه باید حداقل یک دقیقه باشد.');
  const old=bestLifeItem(itemId),now=new Date().toISOString(),next={id:itemId||id(),title,kind:document.getElementById('bestLifeKind').value==='project'?'project':'goal',dailySeconds,active:document.getElementById('bestLifeActive').checked,createdAt:old?.createdAt||now,updatedAt:now};
  if(old)Object.assign(old,next);else S.goalTimers.items.push(next);
  if(!next.active&&S.goalTimers.active?.goalId===next.id)bestLifeStopTimer(next.id,false,true);
  save();render();
  requestAnimationFrame(()=>document.getElementById('bestLifeGoalManager')?.scrollIntoView({block:'start'}));
}
function bestLifeEditItem(goalId){
  const item=bestLifeItem(goalId);if(!item)return;
  document.getElementById('bestLifeItemId').value=item.id;document.getElementById('bestLifeKind').value=item.kind;
  document.getElementById('bestLifeTitle').value=item.title;document.getElementById('bestLifeHours').value=Math.floor(item.dailySeconds/3600);
  document.getElementById('bestLifeMinutes').value=Math.round(item.dailySeconds%3600/60);document.getElementById('bestLifeActive').checked=item.active!==false;
  document.getElementById('bestLifeSubmit').textContent='ذخیره تغییرات';document.getElementById('bestLifeCancelEdit').classList.remove('hide');
  document.getElementById('bestLifeTitle').focus();
}
function bestLifeResetForm(){
  const form=document.getElementById('bestLifeGoalForm');if(!form)return;form.reset();
  document.getElementById('bestLifeItemId').value='';document.getElementById('bestLifeHours').value='1';document.getElementById('bestLifeMinutes').value='0';document.getElementById('bestLifeActive').checked=true;
  document.getElementById('bestLifeSubmit').textContent='+ افزودن به نوار';document.getElementById('bestLifeCancelEdit').classList.add('hide');
}
function bestLifeToggleItem(goalId){
  const item=bestLifeItem(goalId);if(!item)return;
  item.active=item.active===false;item.updatedAt=new Date().toISOString();
  if(!item.active&&S.goalTimers.active?.goalId===goalId)bestLifeStopTimer(goalId,false,true);
  save();render();
}
function bestLifeDeleteItem(goalId){
  const item=bestLifeItem(goalId);if(!item||!confirm(`«${item.title}» از نوار زمان روزانه حذف شود؟`))return;
  if(S.goalTimers.active?.goalId===goalId)bestLifeStopTimer(goalId,false,true);
  S.goalTimers.items=S.goalTimers.items.filter(row=>row.id!==goalId);
  Object.values(S.goalTimers.logs).forEach(day=>{if(day&&typeof day==='object')delete day[goalId]});
  save();render();
}

function bestLifeApplyNav(){
  const removed=new Set(['systemsV7','wheelV7']);
  const items=C.nav.filter(item=>!removed.has(item[0])),dashboard=items.find(item=>item[0]==='dashboard'),habits=items.find(item=>item[0]==='habits');
  C.nav=[dashboard,habits,...items.filter(item=>item!==dashboard&&item!==habits)].filter(Boolean);
  if(removed.has(view))view='dashboard';
}
function bestLifeCleanDashboard(){
  document.querySelector('.v76WheelDashboard')?.remove();
  document.querySelectorAll('.v76DashboardLower > .card').forEach(card=>{if(card.textContent.includes('وضعیت سیستم‌ها'))card.remove()});
  document.querySelectorAll('.v76ActionGrid > article').forEach(card=>{if(card.textContent.includes('سیستم و پروژه'))card.remove()});
  document.querySelectorAll('.v76CommandStrip > span').forEach(item=>{if(item.textContent.includes('LEVEL UP'))item.remove()});
}
function bestLifeRename(){
  document.title='Planner for Best Life 7.9';
  const brand=document.querySelector('.brand h1');if(brand)brand.textContent='Planner for Best Life';
  const sub=document.querySelector('.brand p');if(sub)sub.textContent='زندگی بهتر، هدف روشن، اقدام پیوسته';
  const label=document.getElementById('calendarLabel');if(label)label.textContent='Planner for Best Life 7.9 · تمرکز، زمان و پیشرفت';
}

const bestLifeAlertsBase=v73Alerts;
v73Alerts=function(){return bestLifeAlertsBase().filter(item=>item.view!=='systemsV7'&&!String(item.title||'').includes('سیستم'))};
window.v73Alerts=v73Alerts;

const bestLifeDashBase=dash;
dash=function(){bestLifeDashBase();bestLifeCleanDashboard()};window.dash=dash;

const bestLifeDailyBase=daily;
daily=function(){bestLifeDailyBase();bestLifeInjectDailyPanel()};window.daily=daily;

const bestLifeGoalsBase=v72GoalsView;
v72GoalsView=function(){bestLifeGoalsBase();bestLifeInjectManager()};window.v72GoalsView=v72GoalsView;

const bestLifeRenderBase=render;
render=function(){const out=bestLifeRenderBase();bestLifeRename();bestLifeTick();return out};window.render=render;

window.bestLifeToggleTimer=bestLifeToggleTimer;
window.bestLifeGoToGoals=bestLifeGoToGoals;
window.bestLifeEditItem=bestLifeEditItem;
window.bestLifeResetForm=bestLifeResetForm;
window.bestLifeToggleItem=bestLifeToggleItem;
window.bestLifeDeleteItem=bestLifeDeleteItem;

function bestLifeInit(){
  bestLifeEnsureState();bestLifeApplyNav();bestLifeRename();buildNav();render();bestLifeStartTicker();
  setTimeout(bestLifeRename,0);
}
bestLifeInit();
