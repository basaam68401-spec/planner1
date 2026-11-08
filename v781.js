'use strict';

// ===== Planner for Best Life 7.8.1 =====
// لایه تغییرات روی نسخه 7.8: حذف سیستم/چرخ زندگی از رابط، عادت‌ها بعد از داشبورد،
// و بودجه زمانی روزانه مستقل برای اهداف و پروژه‌های چندروزه.
const V781_SCHEMA='planner-for-best-life-v7.8.1';
const V781_TIME_MAP='dailyGoalTime';
let v781TickHandle=null;

function v781Now(){return new Date().toISOString()}
function v781Clamp(v,a=0,b=100){return Math.max(a,Math.min(b,Number(v)||0))}
function v781EnsureState(){
  S.meta=S.meta||{};
  S.meta.schemaVersion=V781_SCHEMA;
  S.settingsV7=S.settingsV7||{};
  S.settingsV7.systemsHidden=true;
  S.settingsV7.lifeWheelHidden=true;
  S[V781_TIME_MAP]=(S[V781_TIME_MAP]&&typeof S[V781_TIME_MAP]==='object'&&!Array.isArray(S[V781_TIME_MAP]))?S[V781_TIME_MAP]:{};
  localStorage.setItem(K,JSON.stringify(S));
  window.S=S;
}
function v781DayRows(date){
  v781EnsureState();
  const rows=Array.isArray(S[V781_TIME_MAP][date])?S[V781_TIME_MAP][date]:[];
  S[V781_TIME_MAP][date]=rows;
  return rows;
}
function v781Touch(date){
  try{if(typeof v7TouchMap==='function')v7TouchMap(V781_TIME_MAP,date)}catch(_){ }
}
function v781SaveDate(date){v781Touch(date);save()}
function v781RowId(type,id){return `${type}:${id}`}
function v781Entity(row){
  if(row?.entityType==='goal')return (S.goalsV7||[]).find(x=>x.id===row.entityId)||null;
  if(row?.entityType==='project')return (S.projects||[]).find(x=>x.id===row.entityId)||null;
  return null;
}
function v781EntityTitle(row){return v781Entity(row)?.title||row?.titleSnapshot||'هدف / پروژه حذف‌شده'}
function v781EntityTypeLabel(type){return type==='goal'?'هدف':'پروژه'}
function v781EntityDue(row){return v781Entity(row)?.due||''}
function v781ElapsedMs(row,now=Date.now()){
  const base=Math.max(0,Number(row?.elapsedMs)||0);
  if(!row?.runningSince)return base;
  const start=Date.parse(row.runningSince);
  return Number.isFinite(start)?base+Math.max(0,now-start):base;
}
function v781Progress(row,now=Date.now()){
  if(row?.completed)return 100;
  const target=Math.max(1,Number(row?.plannedMinutes)||0)*60000;
  return Math.round(v781Clamp(v781ElapsedMs(row,now)/target*100));
}
function v781FormatDuration(ms,seconds=true){
  let total=Math.max(0,Math.floor((Number(ms)||0)/1000));
  const h=Math.floor(total/3600);total-=h*3600;
  const m=Math.floor(total/60);const s=total-m*60;
  return seconds?`${fa(pad(h))}:${fa(pad(m))}:${fa(pad(s))}`:(h?`${fa(h)} ساعت و ${fa(m)} دقیقه`:`${fa(m)} دقیقه`);
}
function v781PlannedLabel(mins){
  const m=Math.max(0,Math.round(Number(mins)||0)),h=Math.floor(m/60),r=m%60;
  if(h&&r)return `${fa(h)} ساعت و ${fa(r)} دقیقه`;
  if(h)return `${fa(h)} ساعت`;
  return `${fa(r)} دقیقه`;
}
function v781TimeSummaryAll(entityType,entityId){
  let total=0,days=0;
  for(const rows of Object.values(S[V781_TIME_MAP]||{})){
    if(!Array.isArray(rows))continue;
    const row=rows.find(r=>r.entityType===entityType&&r.entityId===entityId);
    if(row){total+=v781ElapsedMs(row);days++}
  }
  return {total,days};
}
function v781DueText(due){
  if(!due)return 'بدون مهلت';
  const diff=v72DateDiff(todayJ(),due);
  if(diff>0)return `${fa(diff)} روز تا مهلت`;
  if(diff===0)return 'مهلت امروز';
  return `${fa(Math.abs(diff))} روز از مهلت گذشته`;
}
function v781GoalOptionsHtml(current=''){
  const rows=(S.goalsV7||[]).filter(g=>g.id===current||!['completed','archived','someday'].includes(g.status));
  return rows.map(g=>`<option value="goal:${g.id}" ${current===g.id?'selected':''}>🎯 ${esc(g.title||'هدف بدون عنوان')}</option>`).join('');
}
function v781ProjectOptionsHtml(current=''){
  const rows=(S.projects||[]).filter(p=>p.id===current||!['completed','cancelled'].includes(p.status));
  return rows.map(p=>`<option value="project:${p.id}" ${current===p.id?'selected':''}>🧩 ${esc(p.title||'پروژه بدون عنوان')}</option>`).join('');
}
function v781AllocationDialog(){
  if(document.getElementById('v781AllocationDialog'))return;
  document.body.insertAdjacentHTML('beforeend',`
  <dialog id="v781AllocationDialog"><form id="v781AllocationForm" class="v781AllocationForm">
    <div class="dlgHead"><div><h3 id="v781AllocationTitle">اختصاص زمان امروز</h3><p class="muted">این بخش مستقل از کارهای روزانه است و برای اهداف و پروژه‌های چندروزه استفاده می‌شود.</p></div><button type="button" onclick="v781CloseAllocation()">×</button></div>
    <input type="hidden" id="v781AllocationDate"><input type="hidden" id="v781AllocationOldId">
    <div class="formGrid">
      <label class="wide">هدف یا پروژه<select id="v781AllocationEntity" required></select></label>
      <label>زمان برنامه‌ریزی‌شده امروز، دقیقه<input id="v781AllocationMinutes" type="number" min="5" max="1440" step="5" value="60" required></label>
      <label>یادداشت امروز<input id="v781AllocationNote" placeholder="مثلاً تمرکز روی بخش روش تحقیق"></label>
    </div>
    <footer><button type="button" id="v781DeleteAllocation" class="danger hide">حذف از امروز</button><span></span><button type="button" onclick="v781CloseAllocation()">انصراف</button><button class="primary">ذخیره</button></footer>
  </form></dialog>`);
  document.getElementById('v781AllocationForm').onsubmit=e=>{e.preventDefault();v781SaveAllocation()};
}
function v781OpenAllocation(date=sel,rowId='',preset=''){
  v781AllocationDialog();
  const rows=v781DayRows(date),row=rows.find(r=>r.id===rowId)||null;
  const select=document.getElementById('v781AllocationEntity');
  const value=row?`${row.entityType}:${row.entityId}`:preset;
  select.innerHTML='<option value="">انتخاب کن...</option><optgroup label="اهداف">'+v781GoalOptionsHtml(row?.entityType==='goal'?row.entityId:'')+'</optgroup><optgroup label="پروژه‌ها">'+v781ProjectOptionsHtml(row?.entityType==='project'?row.entityId:'')+'</optgroup>';
  if(value)select.value=value;
  select.disabled=!!row;
  document.getElementById('v781AllocationDate').value=date;
  document.getElementById('v781AllocationOldId').value=rowId;
  document.getElementById('v781AllocationMinutes').value=row?.plannedMinutes||60;
  document.getElementById('v781AllocationNote').value=row?.note||'';
  document.getElementById('v781AllocationTitle').textContent=row?'ویرایش زمان امروز':'اختصاص زمان به هدف یا پروژه';
  const del=document.getElementById('v781DeleteAllocation');del.classList.toggle('hide',!row);del.onclick=()=>v781DeleteAllocation(date,rowId);
  document.getElementById('v781AllocationDialog').showModal();
}
function v781CloseAllocation(){
  const d=document.getElementById('v781AllocationDialog');if(d?.open)d.close();
  const s=document.getElementById('v781AllocationEntity');if(s)s.disabled=false;
}
function v781SaveAllocation(){
  const date=document.getElementById('v781AllocationDate').value||sel,oldId=document.getElementById('v781AllocationOldId').value;
  const raw=document.getElementById('v781AllocationEntity').value,minutes=Math.max(5,Math.min(1440,Number(document.getElementById('v781AllocationMinutes').value)||0));
  if(!raw||!minutes)return alert('هدف/پروژه و زمان امروز را کامل کن.');
  const [entityType,entityId]=raw.split(':');
  if(!['goal','project'].includes(entityType)||!entityId)return alert('هدف یا پروژه معتبر نیست.');
  const entity=entityType==='goal'?v72Goal(entityId):v72Project(entityId);if(!entity)return alert('هدف یا پروژه پیدا نشد.');
  const rows=v781DayRows(date),duplicate=rows.find(r=>r.entityType===entityType&&r.entityId===entityId&&r.id!==oldId);
  if(duplicate)return alert('این هدف یا پروژه برای این روز قبلاً اضافه شده است.');
  const old=rows.find(r=>r.id===oldId),now=v781Now();
  const row={...(old||{}),id:old?.id||v781RowId(entityType,entityId),entityType,entityId,titleSnapshot:entity.title||'',plannedMinutes:minutes,note:document.getElementById('v781AllocationNote').value.trim(),elapsedMs:Math.max(0,Number(old?.elapsedMs)||0),runningSince:old?.runningSince||null,completed:old?.completed||false,createdAt:old?.createdAt||now,updatedAt:now};
  const i=rows.findIndex(r=>r.id===row.id);i>=0?rows.splice(i,1,row):rows.push(row);
  v781SaveDate(date);v781CloseAllocation();render();
}
function v781DeleteAllocation(date,rowId){
  if(!confirm('این هدف/پروژه فقط از برنامه زمانی همین روز حذف شود؟ اطلاعات خود هدف یا پروژه حذف نمی‌شود.'))return;
  S[V781_TIME_MAP][date]=v781DayRows(date).filter(r=>r.id!==rowId);v781SaveDate(date);v781CloseAllocation();render();
}
function v781Start(date,rowId){
  const row=v781DayRows(date).find(r=>r.id===rowId);if(!row||row.runningSince)return;
  row.runningSince=v781Now();row.completed=false;row.updatedAt=v781Now();v781SaveDate(date);v781StartTicker();v781Tick();
}
function v781Stop(date,rowId){
  const row=v781DayRows(date).find(r=>r.id===rowId);if(!row||!row.runningSince)return;
  row.elapsedMs=v781ElapsedMs(row);row.runningSince=null;row.updatedAt=v781Now();v781SaveDate(date);v781Tick();
}
function v781ToggleDone(date,rowId){
  const row=v781DayRows(date).find(r=>r.id===rowId);if(!row)return;
  if(row.runningSince){row.elapsedMs=v781ElapsedMs(row);row.runningSince=null}
  row.completed=!row.completed;row.updatedAt=v781Now();v781SaveDate(date);render();
}
function v781ResetTimer(date,rowId){
  if(!confirm('زمان ثبت‌شده این مورد برای همین روز صفر شود؟'))return;
  const row=v781DayRows(date).find(r=>r.id===rowId);if(!row)return;
  row.elapsedMs=0;row.runningSince=null;row.completed=false;row.updatedAt=v781Now();v781SaveDate(date);render();
}
function v781AllocationSegment(row,date,now=Date.now()){
  const elapsed=v781ElapsedMs(row,now),p=v781Progress(row,now),remaining=Math.max(0,row.plannedMinutes*60000-elapsed),running=!!row.runningSince,due=v781EntityDue(row);
  const weight=Math.max(30,Number(row.plannedMinutes)||60);
  return `<article class="v781AllocationSegment ${running?'running':''} ${row.completed||p>=100?'completed':''}" data-id="${esc(row.id)}" data-date="${esc(date)}" style="--p:${p};--weight:${weight}">
    <div class="v781SegmentFill" aria-hidden="true"></div>
    <div class="v781SegmentBody">
      <div class="v781SegmentHead"><span class="v781EntityType">${v781EntityTypeLabel(row.entityType)}</span><button class="v781Tiny" type="button" title="ویرایش" onclick="v781OpenAllocation('${date}','${row.id}')">✎</button></div>
      <h4>${esc(v781EntityTitle(row))}</h4>
      <div class="v781Timer" data-role="timer">${v781FormatDuration(elapsed)}</div>
      <div class="v781Target"><span>${fa(p)}٪</span><small>${v781PlannedLabel(row.plannedMinutes)} برنامه امروز</small></div>
      <div class="v781Remaining" data-role="remaining">${remaining>0?`${v781FormatDuration(remaining,false)} مانده`:'زمان هدف امروز تکمیل شد'}</div>
      ${row.note?`<p>${esc(row.note)}</p>`:''}${due?`<small class="v781Due">⏳ ${esc(v781DueText(due))}</small>`:''}
      <div class="v781SegmentActions">
        ${running?`<button type="button" class="stop" onclick="v781Stop('${date}','${row.id}')">■ توقف</button>`:`<button type="button" class="start" onclick="v781Start('${date}','${row.id}')">▶ شروع</button>`}
        <button type="button" onclick="v781ToggleDone('${date}','${row.id}')">${row.completed?'↶ بازگشایی':'✓ تکمیل'}</button>
        <button type="button" class="v781Reset" title="صفرکردن زمان امروز" onclick="v781ResetTimer('${date}','${row.id}')">↺</button>
      </div>
    </div>
  </article>`;
}
function v781DailyTimeInvestment(date){
  const rows=v781DayRows(date),now=Date.now();
  const planned=rows.reduce((s,r)=>s+Math.max(0,Number(r.plannedMinutes)||0),0);
  const elapsed=rows.reduce((s,r)=>s+v781ElapsedMs(r,now),0);
  const avg=rows.length?Math.round(rows.reduce((s,r)=>s+v781Progress(r,now),0)/rows.length):0;
  return `<section class="card v781DailyInvestment">
    <div class="v781InvestmentHead"><div><small>مستقل از کارهای روزانه</small><h3>سرمایه‌گذاری زمانی امروز روی اهداف و پروژه‌ها</h3><p class="muted">هدف یا پروژه می‌تواند چند روز یا چند ماه ادامه داشته باشد؛ فقط بودجه زمانی و زمان واقعی هر روز جداگانه ثبت می‌شود.</p></div><button class="primary" type="button" onclick="v781OpenAllocation('${date}')">+ افزودن هدف / پروژه</button></div>
    <div class="v781InvestmentSummary"><span>زمان برنامه‌ریزی‌شده <b>${v781PlannedLabel(planned)}</b></span><span>زمان ثبت‌شده <b data-v781-summary="elapsed">${v781FormatDuration(elapsed,false)}</b></span><span>تحقق زمانی <b data-v781-summary="avg">${fa(avg)}٪</b></span><span>تعداد تمرکز <b>${fa(rows.length)}</b></span></div>
    ${rows.length?`<div class="v781AllocationScroller"><div class="v781AllocationBar">${rows.map(r=>v781AllocationSegment(r,date,now)).join('')}</div></div>`:'<div class="v781Empty"><b>هنوز برای این روز زمانی به هدف یا پروژه‌ای اختصاص نداده‌ای.</b><span>مثلاً: مقاله SIF ـ ۹۰ دقیقه، EPT ـ ۶۰ دقیقه، ورزش/سلامت ـ ۴۵ دقیقه.</span></div>'}
  </section>`;
}
function v781Tick(){
  if(view!=='daily')return;
  const now=Date.now(),rows=v781DayRows(sel);
  let elapsedAll=0,pAll=0;
  for(const row of rows){
    const el=document.querySelector(`.v781AllocationSegment[data-id="${CSS.escape(row.id)}"]`);if(!el)continue;
    const elapsed=v781ElapsedMs(row,now),p=v781Progress(row,now),remaining=Math.max(0,row.plannedMinutes*60000-elapsed);
    elapsedAll+=elapsed;pAll+=p;
    el.style.setProperty('--p',p);
    el.classList.toggle('completed',row.completed||p>=100);
    const timer=el.querySelector('[data-role="timer"]');if(timer)timer.textContent=v781FormatDuration(elapsed);
    const rem=el.querySelector('[data-role="remaining"]');if(rem)rem.textContent=remaining>0?`${v781FormatDuration(remaining,false)} مانده`:'زمان هدف امروز تکمیل شد';
    const pc=el.querySelector('.v781Target span');if(pc)pc.textContent=fa(p)+'٪';
  }
  const sum=document.querySelector('[data-v781-summary="elapsed"]');if(sum)sum.textContent=v781FormatDuration(elapsedAll,false);
  const avg=document.querySelector('[data-v781-summary="avg"]');if(avg)avg.textContent=fa(rows.length?Math.round(pAll/rows.length):0)+'٪';
}
function v781StartTicker(){
  if(v781TickHandle)return;
  v781TickHandle=setInterval(v781Tick,1000);
}

// ===== همگام‌سازی رکوردی داده‌های روزانه زمان =====
if(typeof v7MergeStates==='function'){
  const v781MergeBase=v7MergeStates;
  v7MergeStates=function(localState,remoteState){
    const out=v781MergeBase(localState,remoteState),l=localState?.[V781_TIME_MAP]||{},r=remoteState?.[V781_TIME_MAP]||{};
    out[V781_TIME_MAP]={};
    for(const date of new Set([...Object.keys(l),...Object.keys(r)])){
      const la=Array.isArray(l[date])?l[date]:[],ra=Array.isArray(r[date])?r[date]:[],by=new Map();
      for(const row of [...la,...ra]){
        const key=row?.id||v781RowId(row?.entityType,row?.entityId),old=by.get(key);
        if(!old||Date.parse(row?.updatedAt||0)>=Date.parse(old?.updatedAt||0))by.set(key,row);
      }
      out[V781_TIME_MAP][date]=[...by.values()];
    }
    return out;
  };
  window.v7MergeStates=v7MergeStates;
}

// ===== منو: عادت‌ها بلافاصله بعد از داشبورد؛ حذف سیستم‌ها و چرخ زندگی از رابط =====
function v781SetNav(){
  C.nav=[
    ['dashboard','📊','داشبورد','مرکز فرماندهی زندگی'],
    ['habits','🟩','عادت‌ها','عادت‌ها و پیگیری روزانه'],
    ['inbox','📥','Inbox','ورودی‌ها / Inbox'],
    ['daily','☀️','روزانه','برنامه روزانه'],
    ['weekly','🗓️','هفتگی','برنامه هفتگی'],
    ['monthly','📅','ماهانه','برنامه ماهانه'],
    ['yearly','🗺️','سالانه','برنامه سالانه'],
    ['tasks','✅','کارها','مدیریت کارها و جست‌وجو'],
    ['goalsV7','🎯','اهداف حرفه‌ای','اهداف حرفه‌ای زمان‌دار'],
    ['projectsV7','🧩','پروژه‌ها','پروژه‌های زمان‌دار متصل به اهداف'],
    ['loansV7','🏦','وام و اقساط','وام‌ها، بدهی‌ها و تقویم اقساط'],
    ['reviewsV7','📝','مرورها','مرور روزانه و هفتگی'],
    ['automationV7','🔔','اعلان و اتوماسیون','اعلان، ثبت صوتی و گزارش خودکار'],
    ['reportsV7','📄','گزارش‌ها','گزارش‌های شخصی و پروژه‌ای']
  ];
}
function v781Navigate(name){
  if(['systemsV7','wheelV7','financeV7'].includes(name))name='dashboard';
  if(!C.nav.some(n=>n[0]===name))name='dashboard';
  view=name;const item=C.nav.find(n=>n[0]===name);if(item)document.getElementById('pageTitle').textContent=item[3];
  document.getElementById('v74MoreNavDialog')?.close();buildNav();render();
}
function v781BuildNav(){
  v781SetNav();
  const full=C.nav.map(n=>`<button class="nav ${view===n[0]?'active':''}" data-v="${n[0]}"><span>${n[1]}</span><span>${n[2]}</span></button>`).join('');
  const side=document.getElementById('sideNav');if(side)side.innerHTML=full;
  const primary=['dashboard','habits','daily','goalsV7'];
  const bottom=primary.map(k=>C.nav.find(n=>n[0]===k)).filter(Boolean).map(n=>`<button class="nav ${view===n[0]?'active':''}" data-v="${n[0]}"><span>${n[1]}</span><span>${n[2]}</span></button>`).join('')+`<button class="nav" id="v74MoreNavBtn"><span>☰</span><span>بیشتر</span></button>`;
  const bot=document.getElementById('bottomNav');if(bot)bot.innerHTML=bottom;
  document.querySelectorAll('#sideNav .nav[data-v],#bottomNav .nav[data-v]').forEach(b=>b.onclick=()=>v781Navigate(b.dataset.v));
  const more=document.getElementById('v74MoreNavBtn');if(more)more.onclick=()=>{const grid=document.getElementById('v74MoreNavGrid');if(grid)grid.innerHTML=C.nav.filter(n=>!primary.includes(n[0])).map(n=>`<button type="button" onclick="v781Navigate('${n[0]}')"><span>${n[1]}</span><b>${n[2]}</b></button>`).join('');document.getElementById('v74MoreNavDialog')?.showModal()};
}
buildNav=v781BuildNav;window.buildNav=buildNav;window.v781Navigate=v781Navigate;
window.v76Navigate=v781Navigate;window.v74Navigate=v781Navigate;

// ===== هشدارها: موارد سیستم/چرخ/مالی پنهان از رابط حذف می‌شوند =====
if(typeof v73Alerts==='function'){
  const v781AlertsBase=v73Alerts;
  v73Alerts=function(){return v781AlertsBase().filter(a=>!['systemsV7','wheelV7','financeV7'].includes(a.view));};
  window.v73Alerts=v73Alerts;
}

// ===== داشبورد بدون سیستم‌ها و چرخ زندگی =====
function v781ActiveProjectsHtml(){
  const rows=(S.projects||[]).filter(p=>p.status==='active').sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')).slice(0,6);
  if(!rows.length)return '<div class="empty">پروژه فعالی وجود ندارد.</div>';
  return `<div class="v73CompactList">${rows.map(p=>`<button onclick="v781Navigate('projectsV7')"><div><b>${esc(p.title)}</b><small>${p.due?esc(v781DueText(p.due)):'بدون مهلت'}</small></div><span>${fa(v72ProjectProgress(p))}٪</span></button>`).join('')}</div>`;
}
function v781TodayTimeHtml(){
  const rows=v781DayRows(todayJ()),now=Date.now();
  if(!rows.length)return '<div class="empty">امروز هنوز برای هدف یا پروژه‌ای بودجه زمانی تعیین نشده است.</div>';
  return `<div class="v73CompactList">${rows.slice(0,6).map(r=>`<button onclick="v781Navigate('daily')"><div><b>${esc(v781EntityTitle(r))}</b><small>${v781PlannedLabel(r.plannedMinutes)} برنامه امروز</small></div><span>${fa(v781Progress(r,now))}٪</span></button>`).join('')}</div>`;
}
function v781Dashboard(){
  const today=todayJ(),completion=v73TaskCompletion(dayTasks(today)),focus=(S.goalsV7||[]).filter(g=>g.status==='focus90').slice(0,3),focusAvg=focus.length?v73Avg(focus.map(v72GoalProgress)):0,projects=(S.projects||[]).filter(p=>p.status==='active'),projectAvg=projects.length?v73Avg(projects.map(v72ProjectProgress)):0,alerts=v73Alerts(),critical=alerts.filter(a=>a.level==='red').length;
  document.getElementById('app').innerHTML=`
    <section class="card v781Command"><div><small>مرکز فرماندهی</small><h3>امروز روی چه چیزی باید اثر بگذاری؟</h3><p class="muted">هشدارها، اهداف زمان‌دار، پروژه‌ها و سرمایه‌گذاری زمانی امروز بدون اجزای اضافی.</p></div><div><button onclick="v72OpenGoal()" class="primary">+ هدف</button><button onclick="v72OpenProject()">+ پروژه</button><button onclick="v781Navigate('daily')">زمان امروز</button><button onclick="openDlg(null,'${today}')">+ فعالیت</button></div></section>
    <section class="v73KpiGrid v781KpiGrid">
      <article>${v73Ring(completion,'امروز')}<div><span>تحقق امروز</span><b>${fa(completion)}٪</b><small>${fa(dayTasks(today).filter(done).length)} کار تکمیل‌شده</small></div></article>
      <article>${v73Ring(focusAvg,'۹۰ روزه')}<div><span>اهداف تمرکز</span><b>${fa(focusAvg)}٪</b><small>${fa(focus.length)} هدف تمرکز</small></div></article>
      <article>${v73Ring(projectAvg,'پروژه')}<div><span>پیشرفت پروژه‌ها</span><b>${fa(projectAvg)}٪</b><small>${fa(projects.length)} پروژه فعال</small></div></article>
      <article class="${critical?'danger':''}">${v73Ring(Math.max(0,100-Math.min(100,critical*20)),'هشدار')}<div><span>هشدار بحرانی</span><b>${fa(critical)}</b><small>${critical?'نیازمند تصمیم':'وضعیت پایدار'}</small></div></article>
    </section>
    <section class="grid dash v73DashboardGrid v781DashboardGrid">
      ${v73DashboardBlock('alerts','مرکز هشدار',v73AlertsHtml(alerts),'c12')}
      ${v73DashboardBlock('focus','اهداف تمرکز ۹۰روزه',v73FocusHtml(),'c6')}
      ${v73DashboardBlock('projects','پروژه‌های فعال زمان‌دار',v781ActiveProjectsHtml(),'c6')}
      ${v73DashboardBlock('time','سرمایه‌گذاری زمانی امروز',v781TodayTimeHtml(),'c6')}
      ${v73DashboardBlock('today','فعالیت‌های امروز',v73TodayHtml(),'c6')}
      ${v73DashboardBlock('heat','نقشه حرارتی ۹۰ روز اخیر',v73Heatmap(90),'c12')}
    </section>`;
}
dash=v781Dashboard;window.dash=dash;window.v73Dashboard=v781Dashboard;

// ===== کارت‌های اهداف و پروژه‌ها: تأکید بر زمان‌بندی و زمان واقعی =====
function v781GoalCard(g){
  const p=v72GoalProgress(g),health=v72GoalHealth(g),projects=(S.projects||[]).filter(x=>x.goalId===g.id).length,time=v781TimeSummaryAll('goal',g.id);
  return `<article class="card v72EntityCard ${health}"><div class="v72EntityTop"><div>${v72HealthBadge(health)} <span class="badge">${esc(v72Label(V72_GOAL_STATUSES,g.status))}</span>${g.due?'<span class="badge v781TimedBadge">⏱ زمان‌دار</span>':''}</div><button onclick="v72OpenGoal('${g.id}')">ویرایش</button></div><div class="v72EntityMain">${v72Ring(p,'پیشرفت')}<div><h3>${esc(g.title||'هدف بدون عنوان')}</h3><p>${esc(v72AreaTitle(g.areaId))}</p><small>${g.start?`شروع ${fa(g.start)} · `:''}${g.due?`${fa(g.due)} · ${esc(v781DueText(g.due))}`:'بدون مهلت'}</small></div></div>${g.result?`<p class="v72Result">نتیجه مطلوب: ${esc(g.result)}</p>`:''}<div class="v72MiniStats"><span>${fa((g.steps||[]).filter(s=>s.done).length)}/${fa((g.steps||[]).length)} گام</span><span>${fa(projects)} پروژه</span><span>${fa(time.days)} روز تمرکز</span><span>${v781FormatDuration(time.total,false)} زمان ثبت‌شده</span></div><div class="bar goalBar"><i style="width:${p}%"></i></div><div class="v72CardActions"><button class="primary" onclick="v781OpenAllocation('${todayJ()}','','goal:${g.id}')">+ زمان امروز</button></div></article>`;
}
v76GoalCard=v781GoalCard;window.v76GoalCard=v781GoalCard;

function v781ProjectCard(p){
  const prog=v72ProjectProgress(p),tasks=v72LinkedTasks(p.id),goal=v72Goal(p.goalId),time=v781TimeSummaryAll('project',p.id);
  return `<article class="card v72EntityCard"><div class="v72EntityTop"><div><span class="badge ${p.status==='active'?'ok':''}">${esc(v72Label(V72_PROJECT_STATUSES,p.status))}</span><span class="badge">${esc(p.type||'سفارشی')}</span>${p.due?'<span class="badge v781TimedBadge">⏱ زمان‌دار</span>':''}</div><button onclick="v72OpenProject('${p.id}')">ویرایش</button></div><div class="v72EntityMain">${v72Ring(prog,'پیشرفت')}<div><h3>${esc(p.title||'پروژه بدون عنوان')}</h3><p>هدف: ${esc(goal?.title||'نامشخص')}</p><small>${p.start?`شروع ${fa(p.start)} · `:''}${p.due?`${fa(p.due)} · ${esc(v781DueText(p.due))}`:'بدون مهلت'}</small></div></div>${p.output?`<p class="v72Result">خروجی نهایی: ${esc(p.output)}</p>`:''}<div class="v72MiniStats"><span>${fa(tasks.filter(done).length)}/${fa(tasks.length)} کار</span><span>${fa(time.days)} روز تمرکز</span><span>${v781FormatDuration(time.total,false)} زمان ثبت‌شده</span><span>اهمیت ${fa(p.importance||3)}/۵</span></div><div class="bar goalBar"><i style="width:${prog}%"></i></div><div class="v72CardActions"><button class="primary" onclick="v781OpenAllocation('${todayJ()}','','project:${p.id}')">+ زمان امروز</button><button onclick="v72CreateTaskForProject('${p.id}')">+ کار مرتبط</button><button onclick="v72OpenProjectTasks('${p.id}')">مشاهده کارها</button></div></article>`;
}
v72ProjectCard=v781ProjectCard;window.v72ProjectCard=v781ProjectCard;



// حذف هدف/پروژه دیگر به داده‌های سیستم پنهان وابسته نیست.
function v781DeleteGoal(id){
  if((S.projects||[]).some(p=>p.goalId===id))return alert('این هدف به پروژه متصل است. ابتدا پروژه‌های وابسته را تغییر بده یا حذف کن.');
  if(!confirm('این هدف حذف شود؟'))return;
  try{v7MarkDeleted?.('goalsV7',id)}catch(_){ }
  S.goalsV7=(S.goalsV7||[]).filter(g=>g.id!==id);save();v72CloseDialog('v72GoalDialog');render();
}
function v781DeleteProject(id){
  if(!confirm('پروژه حذف شود؟ کارهای متصل حذف نمی‌شوند.'))return;
  try{v7MarkDeleted?.('projects',id)}catch(_){ }
  S.projects=(S.projects||[]).filter(p=>p.id!==id);save();v72CloseDialog('v72ProjectDialog');render();
}
v72DeleteGoal=v781DeleteGoal;window.v72DeleteGoal=v72DeleteGoal;
v72DeleteProject=v781DeleteProject;window.v72DeleteProject=v72DeleteProject;

// ===== صفحه روزانه 7.8 + باکس مستقل هدف/پروژه =====
function v781Daily(){
  const plan=S.daily[sel]||{},tasks=dayTasks(sel),m=met(tasks),remaining=m.tot?Math.round(m.todo/m.tot*100):0,overdue=m.tot?Math.round(m.l/m.tot*100):0;
  const important=plan.mostImportant||plan.top3?.[0]||'';
  document.getElementById('app').innerHTML=`<section class="card"><div class="toolbar"><label>انتخاب روز<input id="dayInp" value="${sel}"></label><button id="goDay" class="primary">نمایش</button><button onclick="sel='${todayJ()}';render()">امروز</button><button onclick="sel=addDays(sel,-1);render()">روز قبل</button><button onclick="sel=addDays(sel,1);render()">روز بعد</button></div><h3>${showDate(sel)}</h3><div class="grid dash"><div class="c3">${kpi('تحقق روز',m.comp+'٪',`${m.d} از ${m.tot} انجام‌شده`,m.comp)}</div><div class="c3">${kpi('باقی‌مانده',m.todo,'فعالیت فعال',remaining)}</div><div class="c3">${kpi('میانگین پیشرفت',m.avg+'٪','بر اساس درصد پیشرفت کارها',m.avg)}</div><div class="c3">${kpi('عقب‌افتاده',m.l,'مورد نیازمند پیگیری',overdue)}</div></div></section><section class="card">${rowTitle('تمرکز اصلی روز و مهم‌ترین کار امروز','<button id="saveDay" class="primary">ذخیره تمرکز</button>')}<div class="two"><label>تمرکز اصلی روز<textarea id="focus" placeholder="موضوع اصلی که امروز باید روی آن متمرکز بمانی">${esc(plan.focus||'')}</textarea></label><label>مهم‌ترین کار امروز<textarea id="mostImportant" placeholder="کاری که حتی اگر هیچ کار دیگری انجام نشد، باید تمام شود">${esc(important)}</textarea></label></div></section>${v781DailyTimeInvestment(sel)}${v78Timeboxing(sel,tasks)}<section class="card">${rowTitle('لیست فعالیت‌های روز',`<button class="primary" onclick="openDlg(null,'${sel}')">+ افزودن فعالیت</button>`)}${taskList(tasks)}</section>`;
  document.getElementById('goDay').onclick=()=>{const value=jDate(document.getElementById('dayInp').value);if(!value)return alert('تاریخ شمسی معتبر وارد کنید.');sel=value;mon=value.slice(0,7);wstart=week(value).start;render()};
  document.getElementById('saveDay').onclick=()=>{const old=S.daily[sel]||{},oldTop=Array.isArray(old.top3)?old.top3:['','',''],main=document.getElementById('mostImportant').value.trim();S.daily[sel]={...old,focus:document.getElementById('focus').value.trim(),mostImportant:main,top3:[main,oldTop[1]||'',oldTop[2]||'']};save();render()};
  v781StartTicker();setTimeout(v781Tick,0);
}
daily=v781Daily;window.daily=daily;

// ===== گزارش و پیام روز بدون سیستم‌ها =====
if(typeof v75DailyDigest==='function'){
  v75DailyDigest=function(){
    const tasks=dayTasks(todayJ()).filter(t=>!done(t)&&!canc(t)),alerts=v73Alerts().filter(a=>a.level==='red').length,plan=S.daily?.[todayJ()]||{},important=plan.mostImportant||tasks.sort((a,b)=>prio(b.priority)-prio(a.priority))[0]?.title||'—',time=v781DayRows(todayJ()),planned=time.reduce((s,r)=>s+(Number(r.plannedMinutes)||0),0),actual=time.reduce((s,r)=>s+v781ElapsedMs(r),0);
    return {title:'خلاصه مدیریتی امروز',body:`${fa(tasks.length)} کار فعال؛ ${fa(time.length)} هدف/پروژه زمان‌دار؛ ${fa(alerts)} هشدار بحرانی. مهم‌ترین کار: ${important}`,text:`📊 خلاصه امروز ${fa(todayJ())}\n\nکارهای فعال: ${fa(tasks.length)}\nاهداف/پروژه‌های دارای زمان امروز: ${fa(time.length)}\nزمان برنامه‌ریزی‌شده: ${v781PlannedLabel(planned)}\nزمان ثبت‌شده: ${v781FormatDuration(actual,false)}\nهشدارهای بحرانی: ${fa(alerts)}\nمهم‌ترین کار امروز: ${important}`};
  };
  window.v75DailyDigest=v75DailyDigest;
}



// ===== مرورها و گزارش‌ها بدون وابستگی به سیستم‌ها/چرخ زندگی =====
function v781WeekTime(start){
  const end=addDays(start,6);let planned=0,actual=0,focusDays=0;
  for(const d of dates(start,end)){
    const rows=v781DayRows(d);if(rows.length)focusDays++;
    planned+=rows.reduce((s,r)=>s+(Number(r.plannedMinutes)||0),0);
    actual+=rows.reduce((s,r)=>s+v781ElapsedMs(r),0);
  }
  return {planned,actual,focusDays,percent:planned?Math.round(Math.min(100,actual/(planned*60000)*100)):0};
}
if(typeof v73WeeklyReportHtml==='function'){
  v73WeeklyReportHtml=function(a){
    const t=v781WeekTime(a.start);
    return `<div><span>تحقق کارها</span><b>${fa(a.completion)}٪</b></div><div><span>انجام‌شده</span><b>${fa(a.done)}</b></div><div><span>عقب‌افتاده</span><b>${fa(a.late)}</b></div><div><span>تحقق زمان اهداف/پروژه‌ها</span><b>${fa(t.percent)}٪</b></div><div><span>اهداف ۹۰روزه</span><b>${fa(a.focus)}٪</b></div><div><span>انرژی میانگین</span><b>${a.energy?fa(a.energy)+'/۵':'—'}</b></div>`;
  };
  window.v73WeeklyReportHtml=v73WeeklyReportHtml;
}
function v781PatchWeeklyReviewUi(){
  const field=document.getElementById('v73WeeklySystem');
  const label=field?.closest('label');
  if(label){for(const n of [...label.childNodes])if(n.nodeType===Node.TEXT_NODE&&n.textContent.trim())n.textContent='کدام برنامه، عادت یا روش کاری نیاز به اصلاح دارد؟';}
}
if(typeof v73OpenWeeklyReview==='function'){
  const v781OpenWeeklyBase=v73OpenWeeklyReview;
  v73OpenWeeklyReview=function(start=week(todayJ()).start){const out=v781OpenWeeklyBase(start);v781PatchWeeklyReviewUi();return out;};
  window.v73OpenWeeklyReview=v73OpenWeeklyReview;
}
if(typeof weekly==='function'){
  const v781WeeklyBase=weekly;
  weekly=function(){
    const out=v781WeeklyBase();
    const card=[...document.querySelectorAll('.v73InlineReview')].at(-1),metrics=card?.querySelector('.v73InlineMetrics');
    if(metrics){const t=v781WeekTime(wstart);metrics.innerHTML=`<span>تحقق <b>${fa(v73WeeklyAuto(wstart).completion)}٪</b></span><span>عقب‌افتاده <b>${fa(v73WeeklyAuto(wstart).late)}</b></span><span>تحقق زمان هدف/پروژه <b>${fa(t.percent)}٪</b></span>`;}
    return out;
  };
  window.weekly=weekly;
}
function v781PrintPersonal(){
  const focus=(S.goalsV7||[]).filter(g=>g.status==='focus90'),projects=(S.projects||[]).filter(p=>p.status==='active'),wr=v73WeeklyAuto(week(todayJ()).start),wt=v781WeekTime(wr.start);
  document.getElementById('printArea').innerHTML=`<h1>گزارش شخصی Planner for Best Life</h1><p>تاریخ: ${showDate(todayJ())}</p><div class="printCard"><h2>اهداف ۹۰روزه</h2>${focus.map(g=>`<p><b>${esc(g.title)}</b> — ${fa(v72GoalProgress(g))}٪ — ${g.due?esc(v781DueText(g.due)):'بدون مهلت'}</p>`).join('')||'<p>ثبت نشده</p>'}</div><div class="printCard"><h2>پروژه‌های فعال</h2>${projects.map(p=>`<p><b>${esc(p.title)}</b> — ${fa(v72ProjectProgress(p))}٪ — ${p.due?esc(v781DueText(p.due)):'بدون مهلت'}</p>`).join('')||'<p>ثبت نشده</p>'}</div><div class="printCard"><h2>هفته جاری</h2><p>تحقق کارها: ${fa(wr.completion)}٪ | انجام‌شده: ${fa(wr.done)} | عقب‌افتاده: ${fa(wr.late)}</p><p>زمان برنامه‌ریزی‌شده اهداف/پروژه‌ها: ${v781PlannedLabel(wt.planned)} | زمان واقعی: ${v781FormatDuration(wt.actual,false)} | تحقق زمانی: ${fa(wt.percent)}٪</p></div>`;
  window.print();
}
v73PrintPersonal=v781PrintPersonal;window.v73PrintPersonal=v73PrintPersonal;

function v781ReportsView(){
  const projects=(S.projects||[]).filter(p=>p.status!=='cancelled'),weekTime=v781WeekTime(week(todayJ()).start);
  document.getElementById('app').innerHTML=`<section class="card v73ReviewHero"><div><h3>گزارش‌ها</h3><p class="muted">خروجی شخصی و پروژه‌ای؛ تمرکز بر هدف، پروژه، زمان و کارهای واقعی.</p></div><button onclick="v73PrintPersonal()" class="primary">گزارش شخصی PDF</button></section><section class="grid dash"><div class="c6 card"><h3>گزارش پروژه</h3><label>انتخاب پروژه<select id="v73ReportProject"><option value="">انتخاب کن...</option>${projects.map(p=>`<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select></label><button style="margin-top:12px" onclick="const v=document.getElementById('v73ReportProject').value;if(v)v73PrintProject(v)">ساخت گزارش پروژه</button></div><div class="c6 card"><h3>خلاصه مدیریتی</h3><div class="v73AutoReport"><div><span>اهداف فعال</span><b>${fa(v72ActiveGoalCount())}</b></div><div><span>پروژه فعال</span><b>${fa((S.projects||[]).filter(p=>p.status==='active').length)}</b></div><div><span>تحقق زمان این هفته</span><b>${fa(weekTime.percent)}٪</b></div><div><span>هشدار بحرانی</span><b>${fa(v73Alerts().filter(a=>a.level==='red').length)}</b></div></div></div></section><section class="card v75ReportsSection"><div class="v75SectionHead"><div><h3>گزارش‌های خودکار هفتگی</h3><p class="muted">قابل کپی، اعلان مرورگر و ارسال امن به تلگرام</p></div><button onclick="v75GenerateCurrentReport()" class="primary">ساخت گزارش جاری</button></div>${v75AutoReportsHtml()}</section>`;
}
v73ReportsView=v781ReportsView;window.v73ReportsView=v73ReportsView;

if(typeof v75WeeklyReport==='function'){
  v75WeeklyReport=function(start=week(todayJ()).start,force=false){
    const rid=`weekly_${start}`;let row=(S.autoReports||[]).find(r=>r.id===rid);if(row&&!force)return row;
    const a=v73WeeklyAuto(start),review=S.weeklyReviews?.[start]||{},red=v73Alerts().filter(x=>x.level==='red').length,wt=v781WeekTime(start);
    const text=[`📈 گزارش هفتگی Planner for Best Life`,`هفته ${fa(start)} تا ${fa(a.end)}`,'',`تحقق کارها: ${fa(a.completion)}٪`,`انجام‌شده: ${fa(a.done)}`,`عقب‌افتاده: ${fa(a.late)}`,`تحقق زمان اهداف/پروژه‌ها: ${fa(wt.percent)}٪`,`زمان واقعی اهداف/پروژه‌ها: ${v781FormatDuration(wt.actual,false)}`,`پیشرفت اهداف ۹۰روزه: ${fa(a.focus)}٪`,`انرژی میانگین: ${a.energy?fa(a.energy)+'/۵':'ثبت نشده'}`,`هشدار بحرانی: ${fa(red)}`,review.wins?`بردهای هفته: ${review.wins}`:'',review.keyDecision?`تصمیم هفته آینده: ${review.keyDecision}`:''].filter(Boolean).join('\n');
    const now=v75Now(),next={id:rid,type:'weekly',title:`گزارش هفتگی ${fa(start)}`,weekStart:start,weekEnd:a.end,metrics:{...a,timePercent:wt.percent,timeActual:wt.actual,critical:red},text,createdAt:row?.createdAt||now,updatedAt:now};
    if(row)Object.assign(row,next);else S.autoReports.unshift(next);S.autoReports=S.autoReports.slice(0,V75_REPORT_LIMIT);save();return next;
  };
  window.v75WeeklyReport=v75WeeklyReport;
}

// ===== نام برنامه =====
function v781Rename(){
  document.title='Planner for Best Life 7.8.1';
  const brand=document.querySelector('.brand h1');if(brand)brand.textContent='Planner for Best Life';
  const sub=document.querySelector('.brand p');if(sub)sub.textContent='هدف، زمان، عادت و اقدام برای بهترین زندگی';
  const label=document.getElementById('calendarLabel');if(label)label.textContent='Planner for Best Life 7.8.1 · اهداف و پروژه‌های زمان‌دار';
}

// رندر نهایی: مسیرهای حذف‌شده باز نمی‌شوند، پیام روز نسخه 7.7 همچنان حفظ می‌شود.
const v781RenderBase=render;
render=function(){
  v781SetNav();
  if(['systemsV7','wheelV7','financeV7'].includes(view))view='dashboard';
  const out=v781RenderBase();
  v781Rename();
  return out;
};
window.render=render;

function v781Init(){
  v781EnsureState();v781AllocationDialog();v781SetNav();
  if(!C.nav.some(n=>n[0]===view))view='dashboard';
  buildNav();v781Rename();render();v781StartTicker();
}

window.v781OpenAllocation=v781OpenAllocation;
window.v781CloseAllocation=v781CloseAllocation;
window.v781SaveAllocation=v781SaveAllocation;
window.v781DeleteAllocation=v781DeleteAllocation;
window.v781Start=v781Start;
window.v781Stop=v781Stop;
window.v781ToggleDone=v781ToggleDone;
window.v781ResetTimer=v781ResetTimer;

v781Init();
