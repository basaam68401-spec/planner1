'use strict';

// Planner for Best Life 7.8.3. Additive UI and state changes over the real 7.8.1.
const V782_VERSION='7.8.3';
const V782_WEEK='weeklyInvestmentV782';
const V782_TASK_TIME='weeklyTaskTimeV782';
const V782_RATINGS=['ضعیف','متوسط','خوب','عالی'];
// The 7.7 startup schedules a deferred wisdom injection and rename.
v77InjectDailyWisdom=function(){};
v77Rename=function(){document.title=`Planner for Best Life ${V782_VERSION}`;const label=document.getElementById('calendarLabel');if(label)label.textContent=`Planner for Best Life ${V782_VERSION}`};

function v782State(){
  S.daily=S.daily||{};
  S[V782_WEEK]=S[V782_WEEK]&&typeof S[V782_WEEK]==='object'?S[V782_WEEK]:{};
  S[V782_TASK_TIME]=S[V782_TASK_TIME]&&typeof S[V782_TASK_TIME]==='object'?S[V782_TASK_TIME]:{};
  S.meta=S.meta||{};S.meta.schemaVersion='planner-for-best-life-v7.8.3';
  window.S=S;
}
function v782Rows(start){v782State();return S[V782_WEEK][start]||[]}
function v782DayTaskRows(date){v782State();return S[V782_TASK_TIME][date]||[]}
function v782SaveMap(group,key){if(typeof v7TouchMap==='function')v7TouchMap(group,key);save()}
function v782Metric(tasks){const p=met(tasks).avg;return `<div class="v782Metric">${v73Ring(p,'میانگین پیشرفت')}<div><h3>میانگین پیشرفت</h3><p>بر اساس درصد پیشرفت کارهای این بازه</p></div></div>`}
function v782Motivation(){
  let bar=document.getElementById('v782Motivation');
  if(!bar){bar=document.createElement('div');bar.id='v782Motivation';bar.className='v782Motivation';document.querySelector('main header')?.insertAdjacentElement('afterend',bar)}
  bar.textContent=v77DailyEntry('motivation',11).text;
  document.getElementById('v77DailyWisdom')?.remove();
}
function v782SetNav(){
  v781SetNav();
  const order=['inbox','weekly','daily','monthly','yearly','habits','dashboard','goalsV7','tasks','reviewsV7','automationV7','reportsV7'];
  const byKey=new Map(C.nav.map(item=>[item[0],item]));
  C.nav=order.map(key=>byKey.get(key)).filter(Boolean);
}
function v782BuildNav(){
  v782SetNav();
  const nav=(items)=>items.map(n=>`<button class="nav ${view===n[0]?'active':''}" data-v="${n[0]}"><span>${n[1]}</span><span>${n[2]}</span></button>`).join('');
  document.getElementById('sideNav').innerHTML=nav(C.nav);
  const primary=['inbox','weekly','daily','monthly'];
  document.getElementById('bottomNav').innerHTML=nav(primary.map(k=>C.nav.find(n=>n[0]===k)).filter(Boolean))+`<button class="nav" id="v74MoreNavBtn"><span>☰</span><span>بیشتر</span></button>`;
  document.querySelectorAll('#sideNav .nav,#bottomNav .nav[data-v]').forEach(b=>b.onclick=()=>v781Navigate(b.dataset.v));
  document.getElementById('v74MoreNavBtn').onclick=()=>{const grid=document.getElementById('v74MoreNavGrid');if(grid)grid.innerHTML=C.nav.filter(n=>!primary.includes(n[0])).map(n=>`<button type="button" onclick="v781Navigate('${n[0]}')"><span>${n[1]}</span><b>${n[2]}</b></button>`).join('');document.getElementById('v74MoreNavDialog')?.showModal()};
}
buildNav=v782BuildNav;window.buildNav=buildNav;
const v782NavBase=v781Navigate;
function v782Navigate(name){if(['projectsV7','loansV7','financeV7','systemsV7','wheelV7'].includes(name))name='dashboard';v782NavBase(name)}
window.v781Navigate=v782Navigate;window.v76Navigate=v782Navigate;window.v74Navigate=v782Navigate;

function v782GoalCard(g){
  const p=v72GoalProgress(g),time=v781TimeSummaryAll('goal',g.id),health=v72GoalHealth(g);
  return `<article class="card v72EntityCard ${health}"><div class="v72EntityTop"><div>${v72HealthBadge(health)} <span class="badge">${esc(v72Label(V72_GOAL_STATUSES,g.status))}</span></div><button onclick="v72OpenGoal('${g.id}')">ویرایش</button></div><div class="v72EntityMain">${v72Ring(p,'پیشرفت')}<div><h3>${esc(g.title||'هدف بدون عنوان')}</h3><p>${esc(v72AreaTitle(g.areaId))}</p><small>${g.due?esc(v781DueText(g.due)):'بدون مهلت'}</small></div></div><div class="v72MiniStats"><span>${fa(time.days)} روز تمرکز</span><span>${v781FormatDuration(time.total,false)} زمان ثبت‌شده</span></div><div class="bar goalBar"><i style="width:${p}%"></i></div><div class="v72CardActions"><button class="primary" onclick="v781OpenAllocation('${todayJ()}','','goal:${g.id}')">+ زمان امروز</button></div></article>`;
}
v76GoalCard=v782GoalCard;window.v76GoalCard=v782GoalCard;
function v782DeleteGoal(id){
  if(!confirm('این هدف حذف شود؟ سوابق پروژه‌های قدیمی متصل به آن محفوظ می‌مانند.'))return;
  if(typeof v7MarkDeleted==='function')v7MarkDeleted('goalsV7',id);
  S.goalsV7=(S.goalsV7||[]).filter(g=>g.id!==id);save();v72CloseDialog('v72GoalDialog');render();
}
v72DeleteGoal=v782DeleteGoal;window.v72DeleteGoal=v72DeleteGoal;
function v782AllocationDialog(){
  const base=v781OpenAllocation;
  return function(date=sel,rowId='',preset=''){
    if(preset.startsWith('project:'))return;
    base(date,rowId,preset);
    const label=document.getElementById('v781AllocationEntity')?.closest('label');
    if(label){label.firstChild.textContent='هدف';label.querySelector('optgroup[label="پروژه‌ها"]')?.remove()}
    const dlg=document.getElementById('v781AllocationDialog');
    const title=dlg?.querySelector('h3');if(title)title.textContent='اختصاص زمان به هدف';
    const note=dlg?.querySelector('.dlgHead p');if(note)note.textContent='برای هدف چندروزه، بودجه زمانی همین روز را ثبت کن.';
  };
}
v781OpenAllocation=v782AllocationDialog();window.v781OpenAllocation=v781OpenAllocation;
function v782DailyInvestment(date){
  const rows=v781DayRows(date).filter(r=>r.entityType==='goal'),now=Date.now(),planned=rows.reduce((s,r)=>s+(Number(r.plannedMinutes)||0),0),elapsed=rows.reduce((s,r)=>s+v781ElapsedMs(r,now),0);
  return `<section class="card v781DailyInvestment"><div class="v781InvestmentHead"><div><h3>سرمایه‌گذاری زمانی امروز روی اهداف</h3><p class="muted">بودجه و زمان واقعی هر روز جدا ثبت می‌شود.</p></div><button class="primary" onclick="v781OpenAllocation('${date}')">+ افزودن هدف</button></div><div class="v781InvestmentSummary"><span>بودجه <b>${v781PlannedLabel(planned)}</b></span><span>زمان ثبت‌شده <b data-v781-summary="elapsed">${v781FormatDuration(elapsed,false)}</b></span></div>${rows.length?`<div class="v781AllocationScroller"><div class="v781AllocationBar">${rows.map(r=>v781AllocationSegment(r,date,now)).join('')}</div></div>`:'<p class="muted">برای امروز هدفی انتخاب نشده است.</p>'}</section>`;
}
function v782Rating(date){
  const value=S.daily?.[date]?.evaluation||'';
  return `<div class="v782Rating"><h3>ارزیابی روزانه</h3><div role="group" aria-label="ارزیابی روزانه">${V782_RATINGS.map(x=>`<button type="button" aria-pressed="${x===value}" class="${x===value?'selected':''}" onclick="v782SetRating('${date}','${x}')">${x}</button>`).join('')}</div></div>`;
}
function v782SetRating(date,value){if(!V782_RATINGS.includes(value))return;S.daily[date]={...(S.daily[date]||{}),evaluation:value};v782SaveMap('daily',date);render()}
window.v782SetRating=v782SetRating;
function v782Daily(){
  const date=sel,plan=S.daily[date]||{},tasks=dayTasks(date),important=plan.mostImportant||plan.top3?.[0]||'';
  document.getElementById('app').innerHTML=`<section class="card"><div class="toolbar"><label>انتخاب روز<input id="dayInp" value="${date}"></label><button id="goDay" class="primary">نمایش</button><button onclick="sel='${todayJ()}';render()">امروز</button><button onclick="sel=addDays(sel,-1);render()">روز قبل</button><button onclick="sel=addDays(sel,1);render()">روز بعد</button></div><h3>${showDate(date)}</h3><div class="v782DashboardRow">${v782Metric(tasks)}${v782Rating(date)}</div></section><section class="card"><h3>مهم‌ترین کار امروز</h3><textarea id="mostImportant" placeholder="مهم‌ترین کار این روز">${esc(important)}</textarea><button id="saveDay" class="primary">ذخیره</button></section>${v782DailyInvestment(date)}${v78Timeboxing(date,tasks)}<section class="card">${rowTitle('لیست فعالیت‌های روز',`<button class="primary" onclick="openDlg(null,'${date}')">+ افزودن فعالیت</button>`)}${taskList(tasks)}</section>`;
  document.getElementById('goDay').onclick=()=>{const d=jDate(document.getElementById('dayInp').value);if(!d)return alert('تاریخ معتبر وارد کنید.');sel=d;mon=d.slice(0,7);wstart=week(d).start;render()};
  document.getElementById('saveDay').onclick=()=>{const old=S.daily[date]||{},main=document.getElementById('mostImportant').value.trim();S.daily[date]={...old,mostImportant:main,top3:[main,...(old.top3||[]).slice(1)]};v782SaveMap('daily',date);render()};
  v781StartTicker();v781Tick();
}
daily=v782Daily;window.daily=daily;

function v782WeekEntity(row){return row.kind==='goal'?(S.goalsV7||[]).find(g=>g.id===row.entityId):(S.tasks||[]).find(t=>t.id===row.entityId)}
function v782WeekActual(row,start){
  const ds=dates(start,addDays(start,6));
  if(row.kind==='goal')return ds.reduce((sum,d)=>sum+(S.dailyGoalTime?.[d]||[]).filter(x=>x.entityType==='goal'&&x.entityId===row.entityId).reduce((n,x)=>n+v781ElapsedMs(x),0),0);
  return ds.reduce((sum,d)=>sum+(S[V782_TASK_TIME]?.[d]||[]).filter(x=>x.taskId===row.entityId).reduce((n,x)=>n+v781ElapsedMs(x),0),0);
}
function v782GoalWeekTime(start){
  const ds=dates(start,addDays(start,6));let planned=0,actual=0;
  for(const d of ds)for(const row of S.dailyGoalTime?.[d]||[]){if(row.entityType!=='goal')continue;planned+=Number(row.plannedMinutes)||0;actual+=v781ElapsedMs(row)}
  return {planned,actual,percent:planned?Math.min(100,Math.round(actual/(planned*60000)*100)):0};
}
function v782WeekOptions(start){
  const goals=(S.goalsV7||[]).filter(g=>!['completed','archived','someday'].includes(g.status)).map(g=>`<option value="goal:${g.id}">🎯 ${esc(g.title)}</option>`).join('');
  const end=addDays(start,6);
  const tasks=(S.tasks||[]).filter(t=>!canc(t)&&!done(t)&&t.jDate>=start&&t.jDate<=end).map(t=>`<option value="task:${t.id}">✅ ${esc(t.title)} · ${fa(t.jDate||'')}</option>`).join('');
  return `<option value="">انتخاب کن...</option><optgroup label="اهداف">${goals}</optgroup><optgroup label="کارها">${tasks}</optgroup>`;
}
function v782WeekAdd(start){
  const raw=document.getElementById('v782Entity').value,minutes=Number(document.getElementById('v782Minutes').value),priority=Number(document.getElementById('v782Priority').value);
  if(!raw||!Number.isFinite(minutes)||minutes<5||minutes>10080)return alert('هدف/کار و بودجه معتبر انتخاب کن.');
  const [kind,entityId]=raw.split(':'),rows=v782Rows(start);
  if(rows.some(r=>r.kind===kind&&r.entityId===entityId))return alert('این مورد قبلاً اضافه شده است.');
  const entity=kind==='goal'?(S.goalsV7||[]).find(x=>x.id===entityId):(S.tasks||[]).find(x=>x.id===entityId);
  if(!entity)return;
  S[V782_WEEK][start]=[...rows,{id:raw,kind,entityId,titleSnapshot:entity.title,plannedMinutes:minutes,priority:Math.max(1,Math.min(3,priority||2)),updatedAt:new Date().toISOString()}];
  v782SaveMap(V782_WEEK,start);render();
}
function v782WeekEdit(start,id){
  const row=v782Rows(start).find(r=>r.id===id);if(!row)return;
  const raw=prompt('بودجه هفتگی (دقیقه)',String(row.plannedMinutes));if(raw===null)return;const n=Number(raw);
  if(!Number.isFinite(n)||n<5||n>10080)return alert('بودجه معتبر وارد کن.');
  row.plannedMinutes=n;row.updatedAt=new Date().toISOString();v782SaveMap(V782_WEEK,start);render();
}
function v782WeekRemove(start,id){
  if(!confirm('این مورد از بودجه هفته حذف شود؟ زمان ثبت‌شده روزها محفوظ می‌ماند.'))return;
  S[V782_WEEK][start]=v782Rows(start).filter(r=>r.id!==id);v782SaveMap(V782_WEEK,start);render();
}
function v782WeekTimerRow(start,row){
  const date=todayJ();if(date<start||date>addDays(start,6))return null;
  if(row.kind==='goal'){
    let timer=v781DayRows(date).find(x=>x.entityType==='goal'&&x.entityId===row.entityId);
    if(!timer){const entity=v782WeekEntity(row);timer={id:`goal:${row.entityId}`,entityType:'goal',entityId:row.entityId,titleSnapshot:entity?.title||row.titleSnapshot,plannedMinutes:60,elapsedMs:0,runningSince:null,completed:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};v781DayRows(date).push(timer);v781SaveDate(date)}
    return {date,timer,group:V781_TIME_MAP};
  }
  let timer=v782DayTaskRows(date).find(x=>x.taskId===row.entityId);
  if(!timer){timer={id:row.entityId,taskId:row.entityId,elapsedMs:0,runningSince:null,updatedAt:new Date().toISOString()};S[V782_TASK_TIME][date]=[...v782DayTaskRows(date),timer];v782SaveMap(V782_TASK_TIME,date)}
  return {date,timer,group:V782_TASK_TIME};
}
function v782WeekToggle(start,id){
  const row=v782Rows(start).find(r=>r.id===id);if(!row)return;
  const info=v782WeekTimerRow(start,row);if(!info)return alert('تایمر فقط در روزهای همین هفته اجرا می‌شود.');
  const t=info.timer;if(t.runningSince){t.elapsedMs=v781ElapsedMs(t);t.runningSince=null}else{t.runningSince=new Date().toISOString();t.completed=false}
  t.updatedAt=new Date().toISOString();v782SaveMap(info.group,info.date);render();
}
window.v782WeekAdd=v782WeekAdd;window.v782WeekEdit=v782WeekEdit;window.v782WeekRemove=v782WeekRemove;window.v782WeekToggle=v782WeekToggle;
function v782Investment(start){
  const rows=v782Rows(start).slice().sort((a,b)=>(a.priority||2)-(b.priority||2));
  const planned=rows.reduce((n,r)=>n+(Number(r.plannedMinutes)||0),0),actual=rows.reduce((n,r)=>n+v782WeekActual(r,start),0);
  return `<section class="card v782WeekInvestment"><h3>سرمایه‌گذاری زمانی هفتگی روی اهداف و کارها</h3><p class="muted">زمان اهداف از ثبت‌های روزانه جمع می‌شود. زمان کارها برای هر روز جدا ذخیره می‌شود. با شروع هدفی که برنامه امروز ندارد، یک بودجه ۶۰ دقیقه‌ای برای امروز ساخته می‌شود.</p><div class="v782WeekForm"><label>هدف یا کار<select id="v782Entity">${v782WeekOptions(start)}</select></label><label>بودجه هفته (دقیقه)<input id="v782Minutes" type="number" min="5" max="10080" value="60"></label><label>تقدم<select id="v782Priority"><option value="1">۱ · بالا</option><option value="2" selected>۲ · متوسط</option><option value="3">۳ · پایین</option></select></label><button class="primary" onclick="v782WeekAdd('${start}')">+ افزودن</button></div><div class="v782WeekSummary">بودجه: ${v781PlannedLabel(planned)} · صرف‌شده: <span data-week-actual>${v781FormatDuration(actual)}</span> · تحقق: <span data-week-percent>${fa(planned?Math.min(100,Math.round(actual/(planned*60000)*100)):0)}٪</span></div><div class="v782WeekRows">${rows.map(r=>{const used=v782WeekActual(r,start),pct=Math.min(100,Math.round(used/Math.max(1,r.plannedMinutes*60000)*100)),now=todayJ(),active=r.kind==='goal'?v781DayRows(now).find(x=>x.entityType==='goal'&&x.entityId===r.entityId)?.runningSince:v782DayTaskRows(now).find(x=>x.taskId===r.entityId)?.runningSince;return `<article data-v782-week="${esc(r.id)}"><div><strong>${esc(v782WeekEntity(r)?.title||r.titleSnapshot)}</strong><small>${r.kind==='goal'?'هدف':'کار'} · تقدم ${fa(r.priority||2)} · بودجه ${v781PlannedLabel(r.plannedMinutes)} · صرف‌شده <span data-row-actual>${v781FormatDuration(used)}</span></small></div><div class="v782WeekProgress"><span style="width:${pct}%"></span></div><b>${fa(pct)}٪</b><div class="v782WeekActions"><button onclick="v782WeekToggle('${start}','${r.id}')">${active?'■ توقف':'▶ شروع'}</button><button onclick="v782WeekEdit('${start}','${r.id}')">ویرایش</button><button onclick="v782WeekRemove('${start}','${r.id}')">حذف</button></div></article>`}).join('')||'<p class="muted">هنوز بودجه‌ای برای این هفته ثبت نشده است.</p>'}</div></section>`;
}
function v782TickWeek(){
  if(view!=='weekly')return;
  const rows=v782Rows(wstart),planned=rows.reduce((n,r)=>n+(Number(r.plannedMinutes)||0),0),actual=rows.reduce((n,r)=>n+v782WeekActual(r,wstart),0);
  const total=document.querySelector('[data-week-actual]'),percent=document.querySelector('[data-week-percent]');if(total)total.textContent=v781FormatDuration(actual);if(percent)percent.textContent=fa(planned?Math.min(100,Math.round(actual/(planned*60000)*100)):0)+'٪';
  document.querySelectorAll('[data-v782-week]').forEach(el=>{const row=rows.find(r=>r.id===el.getAttribute('data-v782-week'));if(!row)return;const used=v782WeekActual(row,wstart),pct=Math.min(100,Math.round(used/Math.max(1,row.plannedMinutes*60000)*100));el.querySelector('[data-row-actual]').textContent=v781FormatDuration(used);el.querySelector('.v782WeekProgress span').style.width=pct+'%';el.querySelector(':scope > b').textContent=fa(pct)+'٪'});
}
function v782Weekly(){
  const start=wstart,end=addDays(start,6),ds=dates(start,end),ts=inRange(start,end),pl=S.weekly[start]||{};
  document.getElementById('app').innerHTML=`<section class="card"><div class="toolbar"><label>تاریخ داخل هفته<input id="weekInp" value="${sel}"></label><button id="goWeek" class="primary">نمایش</button><button onclick="wstart=addDays(wstart,-7);sel=wstart;render()">هفته قبل</button><button onclick="wstart=addDays(wstart,7);sel=wstart;render()">هفته بعد</button></div><h3>هفته ${fa(start)} تا ${fa(end)}</h3>${v782Metric(ts)}</section>${v782Investment(start)}<section class="card">${rowTitle('تمرکز و اهداف هفتگی','<button id="saveWeek" class="primary">ذخیره هفته</button>')}<div class="two"><label>تمرکز هفته<textarea id="wf">${esc(pl.focus||'')}</textarea></label><div class="top3">${[0,1,2].map(i=>`<label>هدف ${fa(i+1)}<input class="wg" value="${esc(pl.goals?.[i]||'')}"></label>`).join('')}</div></div><label>مرور پایان هفته<textarea id="wrv">${esc(pl.review||'')}</textarea></label></section><section class="card">${rowTitle('برد هفتگی',`<button class="primary" onclick="openDlg(null,'${sel}')">+ افزودن فعالیت</button>`)}<div class="week">${ds.map(d=>`<div class="daycol"><b>${showDate(d).replace(String(C.year),'')}</b>${dayTasks(d).map(t=>`<div class="mini" onclick="openDlg(S.tasks.find(x=>x.id==='${t.id}'))"><b>${esc(t.title)}</b><br><span class="muted">${esc(t.start||'بدون ساعت')}</span></div>`).join('')||'<p class="muted">فعالیتی ثبت نشده</p>'}</div>`).join('')}</div></section>`;
  document.getElementById('goWeek').onclick=()=>{const d=jDate(document.getElementById('weekInp').value);if(!d)return alert('تاریخ معتبر وارد کنید.');sel=d;wstart=week(d).start;render()};
  document.getElementById('saveWeek').onclick=()=>{S.weekly[start]={...pl,focus:document.getElementById('wf').value.trim(),goals:[...document.querySelectorAll('.wg')].map(x=>x.value.trim()),review:document.getElementById('wrv').value.trim()};v782SaveMap('weekly',start);render()};
  const review=S.weeklyReviews?.[start];document.getElementById('app').insertAdjacentHTML('beforeend',`<section class="card v73InlineReview"><h3>مرور هفتگی</h3><button class="primary" onclick="v73OpenWeeklyReview('${start}')">${review?'ویرایش مرور':'شروع مرور'}</button></section>`);
  v782TickWeek();
}
weekly=v782Weekly;window.weekly=weekly;
function v782MonthGrid(key){
  const [y,m]=key.split('-').map(Number),off=(jToDate(fmt(y,m,1)).getDay()+1)%7;
  let cells=C.wd.map(w=>`<div class="mhead">${w}</div>`).join('')+'<div class="mcell emptyCell"></div>'.repeat(off);
  for(let day=1;day<=ml(y,m);day++){
    const date=fmt(y,m,day),tasks=dayTasks(date);
    cells+=`<button type="button" class="mcell v782MonthCell ${date===todayJ()?'today':''}" onclick="sel='${date}';v782Navigate('daily')" aria-label="${fa(date)}: ${fa(tasks.length)} کار"><b>${fa(day)}</b><div class="v782MonthTitles">${tasks.slice(0,3).map(t=>`<span class="${done(t)?'done':''}" title="${esc(t.title)}">${esc(t.title)}</span>`).join('')}${tasks.length>3?`<small>+${fa(tasks.length-3)} کار</small>`:''}</div></button>`;
  }
  return `<div class="month v782Month">${cells}</div>`;
}
function v782Monthly(){
  const range=mrange(mon),ts=inRange(range.start,range.end),plan=S.monthly[mon]||{};
  document.getElementById('app').innerHTML=`<section class="card"><div class="toolbar"><label>ماه<select id="monSel">${C.months.map((x,i)=>`<option value="${C.year}-${pad(i+1)}" ${mon.endsWith(pad(i+1))?'selected':''}>${x}</option>`).join('')}</select></label><button id="goMon" class="primary">نمایش</button></div><h3>${C.months[+mon.slice(5)-1]} ${fa(C.year)}</h3>${v782Metric(ts)}</section><section class="card">${rowTitle('تمرکز و اهداف ماه','<button id="saveMon" class="primary">ذخیره ماه</button>')}<div class="two"><label>تمرکز ماه<textarea id="mf">${esc(plan.focus||'')}</textarea></label><div class="top3">${[0,1,2].map(i=>`<label>هدف ${fa(i+1)}<input class="mg" value="${esc(plan.goals?.[i]||'')}"></label>`).join('')}</div></div><label>مرور پایان ماه<textarea id="mr">${esc(plan.review||'')}</textarea></label></section><section class="card">${rowTitle('تقویم ماهانه',`<button class="primary" onclick="openDlg(null,'${range.start}')">+ افزودن فعالیت</button>`)}${v782MonthGrid(mon)}</section>`;
  document.getElementById('goMon').onclick=()=>{mon=document.getElementById('monSel').value;sel=mon+'-01';render()};
  document.getElementById('saveMon').onclick=()=>{S.monthly[mon]={...plan,focus:document.getElementById('mf').value.trim(),goals:[...document.querySelectorAll('.mg')].map(x=>x.value.trim()),review:document.getElementById('mr').value.trim()};v782SaveMap('monthly',mon);render()};
}
monthly=v782Monthly;window.monthly=monthly;
function v782Yearly(){
  const yr=yrange(),ts=inRange(yr.start,yr.end),m=met(ts),vision=S.year?.vision||'';
  document.getElementById('app').innerHTML=`<section class="card"><h3>نمای کل سال ${fa(C.year)}</h3><div class="grid dash"><div class="c3">${kpi('میانگین پیشرفت',m.avg+'٪','بر اساس کارهای سال',m.avg)}</div></div></section><section class="card">${rowTitle('نقشه حرارتی عملکرد سال')}<div class="heat">${dates(yr.start,yr.end).map(d=>{const c=met(dayTasks(d)).comp,lv=c>=90?4:c>=65?3:c>=35?2:c>0?1:0;return `<span class="h${lv}" title="${d}: ${c}%"></span>`}).join('')}</div></section><section class="card"><h3>چشم‌انداز سال</h3><textarea id="vision">${esc(vision)}</textarea><button class="primary" id="saveYear">ذخیره چشم‌انداز</button></section><section class="card">${rowTitle('عملکرد ۱۲ ماه')}<canvas id="ychart" class="chart"></canvas></section>`;
  document.getElementById('saveYear').onclick=()=>{S.year=S.year||{};S.year.vision=document.getElementById('vision').value.trim();save();render()};bar(document.getElementById('ychart'),monthPerf());
}
yearly=v782Yearly;window.yearly=yearly;
function v782Dashboard(){
  const today=todayJ(),wr=week(today),mr=mrange(today.slice(0,7));
  document.getElementById('app').innerHTML=`<section class="card"><h3>میانگین پیشرفت</h3><div class="v782DashboardTriplet"><article><h4>روزانه</h4>${v782Metric(dayTasks(today))}</article><article><h4>هفتگی</h4>${v782Metric(inRange(wr.start,wr.end))}</article><article><h4>ماهانه</h4>${v782Metric(inRange(mr.start,mr.end))}</article></div></section><section class="card">${rowTitle('فعالیت‌های امروز',`<button class="primary" onclick="openDlg(null,'${today}')">+ فعالیت</button>`)}${taskList(dayTasks(today))}</section><section class="card">${rowTitle('اهداف فعال',`<button class="primary" onclick="v72OpenGoal()">+ هدف</button>`)}${v73FocusHtml()}</section>`;
}
dash=v782Dashboard;window.dash=dash;
setInterval(v782TickWeek,1000);
function v782ReportsView(){document.getElementById('app').innerHTML=`<section class="card"><h3>گزارش‌ها</h3><button onclick="v73PrintPersonal()" class="primary">گزارش شخصی PDF</button></section><section class="card v75ReportsSection"><h3>گزارش‌های خودکار هفتگی</h3>${v75AutoReportsHtml()}</section>`}
v73ReportsView=v782ReportsView;window.v73ReportsView=v73ReportsView;
function v782PrintPersonal(){const a=v73WeeklyAuto(week(todayJ()).start),t=v782GoalWeekTime(a.start);document.getElementById('printArea').innerHTML=`<h1>گزارش شخصی Planner for Best Life</h1><p>${showDate(todayJ())}</p><p>تحقق کارهای هفته: ${fa(a.completion)}٪</p><p>زمان اهداف: ${v781FormatDuration(t.actual,false)}</p>`;window.print()}
v73PrintPersonal=v782PrintPersonal;window.v73PrintPersonal=v73PrintPersonal;
v73WeeklyReportHtml=function(a){const t=v782GoalWeekTime(a.start);return `<div><span>تحقق کارها</span><b>${fa(a.completion)}٪</b></div><div><span>انجام‌شده</span><b>${fa(a.done)}</b></div><div><span>عقب‌افتاده</span><b>${fa(a.late)}</b></div><div><span>تحقق زمان اهداف</span><b>${fa(t.percent)}٪</b></div>`};window.v73WeeklyReportHtml=v73WeeklyReportHtml;
v75WeeklyReport=function(start=week(todayJ()).start,force=false){
  const rid=`weekly_${start}`;let row=(S.autoReports||[]).find(r=>r.id===rid);if(row&&!force)return row;
  const a=v73WeeklyAuto(start),goalTime=v782GoalWeekTime(start),investments=v782Rows(start),planned=investments.reduce((n,r)=>n+(Number(r.plannedMinutes)||0),0),actual=investments.reduce((n,r)=>n+v782WeekActual(r,start),0),now=new Date().toISOString();
  const body=[`📈 گزارش هفتگی Planner for Best Life`,`هفته ${fa(start)} تا ${fa(a.end)}`,`تحقق کارها: ${fa(a.completion)}٪`,`انجام‌شده: ${fa(a.done)}`,`عقب‌افتاده: ${fa(a.late)}`,`زمان اهداف: ${v781FormatDuration(goalTime.actual,false)}`,`سرمایه‌گذاری زمانی هفتگی: ${v781FormatDuration(actual,false)} از ${v781PlannedLabel(planned)}`].join('\n');
  const next={id:rid,type:'weekly',title:`گزارش هفتگی ${fa(start)}`,weekStart:start,weekEnd:a.end,metrics:{...a,timeActual:actual,timePlanned:planned},text:body,createdAt:row?.createdAt||now,updatedAt:now};
  if(row)Object.assign(row,next);else S.autoReports.unshift(next);S.autoReports=S.autoReports.slice(0,V75_REPORT_LIMIT);save();return next;
};window.v75WeeklyReport=v75WeeklyReport;
const v782BaseRender=render;
render=function(){
  v782State();v782SetNav();
  if(['projectsV7','loansV7','financeV7','systemsV7','wheelV7'].includes(view))view='dashboard';
  const out=v782BaseRender();
  v782SetNav();
  v782Motivation();
  document.title=`Planner for Best Life ${V782_VERSION}`;
  const label=document.getElementById('calendarLabel');if(label)label.textContent=`Planner for Best Life ${V782_VERSION}`;
  document.getElementById('taskProjectV72')?.closest('label')?.classList.add('hide');
  document.getElementById('v75QuickForm')?.querySelectorAll('[onclick*="v75QuickMoney"]').forEach(el=>el.remove());
  return out;
};window.render=render;
const v782OpenDlgBase=openDlg;
openDlg=function(t=null,d=sel){v782OpenDlgBase(t,d);const option=document.querySelector('#type option[value="پروژه"]');if(option&&t?.type!=='پروژه')option.hidden=true};window.openDlg=openDlg;
// Avoid the old project/loan views and linked finance alerts without deleting their history.
const v782AlertsBase=v73Alerts;
v73Alerts=function(){return v782AlertsBase().filter(a=>!['projectsV7','loansV7','financeV7'].includes(a.view))};window.v73Alerts=v73Alerts;
v75InstallmentEvents=function(){return []};window.v75InstallmentEvents=v75InstallmentEvents;
v75SystemEvents=function(){return []};window.v75SystemEvents=v75SystemEvents;
if(typeof v7MergeStates==='function'){
  const base=v7MergeStates;
  v7MergeStates=function(local,remote){const out=base(local,remote);for(const group of [V782_WEEK,V782_TASK_TIME]){out[group]={};const l=local?.[group]||{},r=remote?.[group]||{};for(const key of new Set([...Object.keys(l),...Object.keys(r)])){const rows=new Map();for(const row of [...(l[key]||[]),...(r[key]||[])]){const old=rows.get(row.id);if(!old||Date.parse(row.updatedAt||0)>=Date.parse(old.updatedAt||0))rows.set(row.id,row)}out[group][key]=[...rows.values()]}}return out};window.v7MergeStates=v7MergeStates;
}
if(localStorage.getItem(K)&&!localStorage.getItem('planner-v782-preupgrade-backup-done')){
  const before=JSON.parse(localStorage.getItem(K));
  v7CreateSnapshotFromState(before,'پیش از ارتقا به 7.8.3').then(()=>localStorage.setItem('planner-v782-preupgrade-backup-done','1')).catch(e=>console.warn('Pre-upgrade backup failed',e));
}
v782State();buildNav();render();
