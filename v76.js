'use strict';

// ===== Planner for Best Life 7.6 =====
// لایه ارتقای رابط بدون حذف داده‌های نسخه‌های قبلی.
const V76_SCHEMA='planner-life-for-soil-v7.6';

function v76EnsureState(){
  S.meta=S.meta||{};
  S.meta.schemaVersion=V76_SCHEMA;
  S.settingsV7=S.settingsV7||{};
  S.settingsV7.financeHidden=true;
  S.settingsV7.legacyGoalsHidden=true;
  localStorage.setItem(K,JSON.stringify(S));
  window.S=S;
}

function v76Percent(v){return Math.max(0,Math.min(100,Math.round(Number(v)||0)))}
function v76Circle(title,value,subtitle,tone='green'){
  const p=v76Percent(value);
  return `<article class="v76CircleCard ${tone}"><div class="v76Circle" style="--p:${p}"><div><b>${fa(p)}٪</b><small>${esc(title)}</small></div></div><p>${esc(subtitle||'')}</p></article>`;
}

// ===== پیشرفت بدون KPI =====
function v76GoalTaskScore(goalId){
  const rows=(S.tasks||[]).filter(t=>t.goalId===goalId&&!t.projectId&&!canc(t));
  return rows.length?v73TaskCompletion(rows):null;
}
function v76GoalProgress(goal){
  if(goal?.status==='completed')return 100;
  const parts=[];
  const sp=v72StepProgress(goal);
  if(sp!=null)parts.push({value:sp,weight:45});
  const projects=(S.projects||[]).filter(p=>p.goalId===goal.id&&p.status!=='cancelled');
  if(projects.length)parts.push({value:v73Avg(projects.map(v72ProjectProgress)),weight:35});
  const tp=v76GoalTaskScore(goal.id);
  if(tp!=null)parts.push({value:tp,weight:20});
  if(!parts.length)return v72Clamp(goal?.manualProgress||0);
  const total=parts.reduce((s,x)=>s+x.weight,0)||1;
  return Math.round(parts.reduce((s,x)=>s+x.value*x.weight,0)/total);
}
v72GoalProgress=v76GoalProgress;window.v72GoalProgress=v72GoalProgress;

function v76AreaTaskScore(areaId){
  const goalIds=new Set((S.goalsV7||[]).filter(g=>g.areaId===areaId).map(g=>g.id));
  const projectIds=new Set((S.projects||[]).filter(p=>p.areaId===areaId||goalIds.has(p.goalId)).map(p=>p.id));
  const systemIds=new Set((S.systems||[]).filter(s=>s.areaId===areaId||goalIds.has(s.goalId)).map(s=>s.id));
  const from=addDays(todayJ(),-89);
  const rows=(S.tasks||[]).filter(t=>t.jDate>=from&&t.jDate<=todayJ()&&!canc(t)&&(goalIds.has(t.goalId)||projectIds.has(t.projectId)||systemIds.has(t.systemId)));
  return rows.length?v73TaskCompletion(rows):null;
}
function v76AreaGoalScore(areaId){
  const rows=(S.goalsV7||[]).filter(g=>g.areaId===areaId&&!['archived','someday'].includes(g.status));
  return rows.length?v73Avg(rows.map(v72GoalProgress)):null;
}
function v76AreaProjectScore(areaId){
  const rows=(S.projects||[]).filter(p=>p.areaId===areaId&&p.status!=='cancelled');
  return rows.length?v73Avg(rows.map(v72ProjectProgress)):null;
}
function v76AreaSystemScore(areaId){
  const rows=(S.systems||[]).filter(s=>s.areaId===areaId&&s.active!==false);
  return rows.length?v73Avg(rows.map(v72SystemAdherence)):null;
}
function v76AreaScore(area){
  return v73WeightedScore([
    {value:v76AreaGoalScore(area.id),weight:35},
    {value:v76AreaProjectScore(area.id),weight:30},
    {value:v76AreaSystemScore(area.id),weight:20},
    {value:v76AreaTaskScore(area.id),weight:15}
  ]);
}
v73AreaGoalScore=v76AreaGoalScore;window.v73AreaGoalScore=v73AreaGoalScore;
v73AreaProjectScore=v76AreaProjectScore;window.v73AreaProjectScore=v73AreaProjectScore;
v73AreaSystemScore=v76AreaSystemScore;window.v73AreaSystemScore=v73AreaSystemScore;
v73AreaScore=v76AreaScore;window.v73AreaScore=v73AreaScore;

// ===== حذف اجزای KPI از فرم‌ها؛ داده قدیمی در حافظه باقی می‌ماند =====
function v76StripKpiUi(){
  const goal=document.getElementById('v72GoalDialog');
  if(goal){
    const p=goal.querySelector('.dlgHead .muted');if(p)p.textContent='پیشرفت از گام‌ها، پروژه‌ها و فعالیت‌های مرتبط محاسبه می‌شود.';
    ['v72GoalStepWeight','v72GoalKpiWeight'].forEach(id=>document.getElementById(id)?.closest('label')?.remove());
    document.getElementById('v72GoalKpis')?.closest('.v72BuilderBlock')?.remove();
    const manual=document.getElementById('v72GoalManual')?.closest('label');if(manual)manual.firstChild.textContent='درصد پیشرفت دستی (فقط در نبود گام و پروژه)';
  }
  const system=document.getElementById('v72SystemDialog');
  if(system){
    ['v72SystemKpiTitle','v72SystemKpiCurrent','v72SystemKpiTarget','v72SystemKpiUnit'].forEach(id=>document.getElementById(id)?.closest('label')?.remove());
    const freq=document.getElementById('v72SystemFrequencyCount')?.closest('label');if(freq)freq.firstChild.textContent='تعداد اجرای مورد انتظار در هر دوره';
  }
  document.getElementById('v73AreaKpiDialog')?.remove();
}

// ===== هدف حرفه‌ای =====
function v76OpenGoal(goalId=''){
  const g=v72Goal(goalId)||{};
  v76StripKpiUi();
  document.getElementById('v72GoalDialogTitle').textContent=goalId?'ویرایش هدف':'هدف جدید';
  document.getElementById('v72GoalId').value=goalId;
  document.getElementById('v72GoalTitle').value=g.title||'';
  document.getElementById('v72GoalArea').innerHTML='<option value="">انتخاب حوزه...</option>'+v72AreaOptions(g.areaId);
  document.getElementById('v72GoalStatus').innerHTML=v72Options(V72_GOAL_STATUSES,g.status||'draft');
  document.getElementById('v72GoalStart').value=g.start||todayJ();
  document.getElementById('v72GoalDue').value=g.due||'';
  document.getElementById('v72GoalImportance').value=g.importance||3;
  document.getElementById('v72GoalManual').value=g.manualProgress||0;
  document.getElementById('v72GoalWhy').value=g.why||'';
  document.getElementById('v72GoalResult').value=g.result||'';
  document.getElementById('v72GoalSteps').innerHTML='';
  (g.steps||[]).forEach(v72AddGoalStep);
  const del=document.getElementById('v72DeleteGoal');del.classList.toggle('hide',!goalId);del.onclick=()=>v72DeleteGoal(goalId);
  document.getElementById('v72GoalDialog').showModal();
}
function v76SaveGoal(){
  const gid=document.getElementById('v72GoalId').value,title=document.getElementById('v72GoalTitle').value.trim(),areaId=document.getElementById('v72GoalArea').value,status=document.getElementById('v72GoalStatus').value;
  if(!title||!areaId)return alert('عنوان و حوزه هدف را کامل کن.');
  if(['active','focus90'].includes(status)&&v72ActiveGoalCount(gid)>=V72_ACTIVE_GOAL_LIMIT)return alert('حداکثر ۷ هدف می‌تواند فعال باشد.');
  if(status==='focus90'&&v72FocusGoalCount(gid)>=V72_FOCUS_GOAL_LIMIT)return alert('حداکثر ۳ هدف تمرکز ۹۰روزه مجاز است.');
  const startRaw=document.getElementById('v72GoalStart').value.trim(),dueRaw=document.getElementById('v72GoalDue').value.trim();
  const start=startRaw?jDate(startRaw):'',due=dueRaw?jDate(dueRaw):'';
  if(startRaw&&!start)return alert('تاریخ شروع معتبر نیست.');if(dueRaw&&!due)return alert('مهلت معتبر نیست.');
  const steps=[...document.querySelectorAll('.v72GoalStepRow')].map(r=>({id:r.dataset.id,title:r.querySelector('.v72Grow')?.value.trim()||'',done:r.querySelector('input[type="checkbox"]')?.checked||false})).filter(s=>s.title);
  const old=v72Goal(gid),now=v72Now();
  const row={...(old||{}),id:gid||v72Uid('goal'),title,areaId,status,start,due,importance:v72Clamp(document.getElementById('v72GoalImportance').value,1,5),manualProgress:v72Clamp(document.getElementById('v72GoalManual').value),why:document.getElementById('v72GoalWhy').value.trim(),result:document.getElementById('v72GoalResult').value.trim(),steps,createdAt:old?.createdAt||now,updatedAt:now};
  if(!old){row.kpis=[];row.stepWeight=100;row.kpiWeight=0;}
  const i=S.goalsV7.findIndex(x=>x.id===row.id);i>=0?S.goalsV7[i]=row:S.goalsV7.unshift(row);
  save();v72CloseDialog('v72GoalDialog');render();
}
v72OpenGoal=v76OpenGoal;window.v72OpenGoal=v72OpenGoal;
v72SaveGoal=v76SaveGoal;window.v72SaveGoal=v72SaveGoal;

function v76GoalCard(g){
  const p=v72GoalProgress(g),health=v72GoalHealth(g),projects=S.projects.filter(x=>x.goalId===g.id).length,systems=S.systems.filter(x=>x.goalId===g.id).length;
  return `<article class="card v72EntityCard ${health}"><div class="v72EntityTop"><div>${v72HealthBadge(health)} <span class="badge">${esc(v72Label(V72_GOAL_STATUSES,g.status))}</span></div><button onclick="v72OpenGoal('${g.id}')">ویرایش</button></div><div class="v72EntityMain">${v72Ring(p,'پیشرفت')}<div><h3>${esc(g.title||'هدف بدون عنوان')}</h3><p>${esc(v72AreaTitle(g.areaId))}</p><small>مهلت: ${g.due?fa(g.due):'بدون مهلت'}</small></div></div>${g.result?`<p class="v72Result">نتیجه مطلوب: ${esc(g.result)}</p>`:''}<div class="v72MiniStats"><span>${fa((g.steps||[]).filter(s=>s.done).length)}/${fa((g.steps||[]).length)} گام</span><span>${fa(projects)} پروژه</span><span>${fa(systems)} سیستم</span></div><div class="bar goalBar"><i style="width:${p}%"></i></div></article>`;
}
function v76GoalsView(){
  const f=JSON.parse(sessionStorage.v72GoalFilter||'{}'),q=f.q||'',status=f.status||'all',area=f.area||'all';
  let rows=[...S.goalsV7];
  if(q)rows=rows.filter(g=>JSON.stringify(g).toLowerCase().includes(q.toLowerCase()));
  if(status!=='all')rows=rows.filter(g=>g.status===status);
  if(area!=='all')rows=rows.filter(g=>g.areaId===area);
  rows.sort((a,b)=>{const rank={focus90:0,active:1,waiting:2,draft:3,paused:4,someday:5,completed:6,archived:7};return (rank[a.status]??9)-(rank[b.status]??9)||(a.due||'9999').localeCompare(b.due||'9999')});
  const active=v72ActiveGoalCount(),focus=v72FocusGoalCount(),avg=S.goalsV7.length?v73Avg(S.goalsV7.map(v72GoalProgress)):0,red=S.goalsV7.filter(g=>v72GoalHealth(g)==='red'&&['active','focus90'].includes(g.status)).length;
  document.getElementById('app').innerHTML=`<section class="grid dash"><div class="c3">${kpi('اهداف فعال',`${active}/${V72_ACTIVE_GOAL_LIMIT}`,'سقف تمرکز فعال',active/V72_ACTIVE_GOAL_LIMIT*100)}</div><div class="c3">${kpi('تمرکز ۹۰روزه',`${focus}/${V72_FOCUS_GOAL_LIMIT}`,'پیروزی‌های اصلی',focus/V72_FOCUS_GOAL_LIMIT*100)}</div><div class="c3">${kpi('میانگین پیشرفت',avg+'٪','بر اساس گام‌ها و خروجی‌ها',avg)}</div><div class="c3">${kpi('خارج از مسیر',red,'نیازمند تصمیم',Math.min(100,red*25))}</div></section><section class="card"><div class="v72PageHead"><div><h3>اهداف حرفه‌ای</h3><p class="muted">اهداف نامحدود ذخیره می‌شوند؛ حداکثر ۷ هدف فعال و ۳ هدف تمرکز ۹۰روزه.</p></div><div><button onclick="v72OpenAreas()">مدیریت حوزه‌ها</button> <button onclick="v72OpenGoal()" class="primary">+ هدف جدید</button></div></div><div class="toolbar"><label>جست‌وجو<input id="v72gq" value="${esc(q)}"></label><label>وضعیت<select id="v72gs"><option value="all">همه وضعیت‌ها</option>${v72Options(V72_GOAL_STATUSES,status)}</select></label><label>حوزه<select id="v72ga"><option value="all">همه حوزه‌ها</option>${v72AreaOptions(area)}</select></label><button id="v72gfilter" class="primary">اعمال</button></div></section><section class="v72CardGrid">${rows.length?rows.map(v76GoalCard).join(''):'<div class="card empty">هدفی با این فیلتر پیدا نشد.</div>'}</section>`;
  document.getElementById('v72gfilter').onclick=()=>{sessionStorage.v72GoalFilter=JSON.stringify({q:document.getElementById('v72gq').value.trim(),status:document.getElementById('v72gs').value,area:document.getElementById('v72ga').value});render()};
}
v72GoalCard=v76GoalCard;window.v72GoalCard=v72GoalCard;
v72GoalsView=v76GoalsView;window.v72GoalsView=v72GoalsView;

// ===== سیستم‌ها بدون KPI =====
function v76OpenSystem(systemId='',presetGoal='',presetProject=''){
  v76StripKpiUi();const s=v72System(systemId)||{};
  document.getElementById('v72SystemDialogTitle').textContent=systemId?'ویرایش سیستم':'ساخت سیستم';
  document.getElementById('v72SystemId').value=systemId;document.getElementById('v72SystemName').value=s.name||'';
  document.getElementById('v72SystemGoal').innerHTML=v72GoalOptions(s.goalId||presetGoal,false);
  document.getElementById('v72SystemProject').innerHTML=v72ProjectOptions(s.projectId||presetProject,s.goalId||presetGoal);
  document.getElementById('v72SystemType').innerHTML=v72Options(V72_SYSTEM_TYPES,s.type||'routine');
  document.getElementById('v72SystemFrequency').innerHTML=v72Options(V72_FREQUENCIES,s.frequency||'manual');
  document.getElementById('v72SystemFrequencyCount').value=s.frequencyCount||1;
  document.getElementById('v72SystemPriority').value=s.priority||'متوسط';
  document.getElementById('v72SystemMinutes').value=s.standardMinutes||30;
  document.getElementById('v72SystemAdherence').value=s.targetAdherence||80;
  document.getElementById('v72SystemNext').value=s.nextRunDate||'';
  document.getElementById('v72SystemResult').value=s.expectedResult||'';
  document.getElementById('v72SystemDesc').value=s.description||'';
  document.getElementById('v72SystemActive').checked=s.active!==false;
  document.getElementById('v72SystemSteps').innerHTML='';(s.steps||[]).forEach(v72AddSystemStep);if(!(s.steps||[]).length)v72AddSystemStep();
  const del=document.getElementById('v72DeleteSystem');del.classList.toggle('hide',!systemId);del.onclick=()=>v72DeleteSystem(systemId);
  document.getElementById('v72SystemDialog').showModal();
}
function v76SaveSystem(){
  const sid=document.getElementById('v72SystemId').value,name=document.getElementById('v72SystemName').value.trim(),goalId=document.getElementById('v72SystemGoal').value;
  if(!name||!goalId)return alert('نام سیستم و هدف مرتبط الزامی است.');
  const nr=document.getElementById('v72SystemNext').value.trim(),nextRunDate=nr?jDate(nr):'';if(nr&&!nextRunDate)return alert('تاریخ اجرای بعدی معتبر نیست.');
  const steps=[...document.querySelectorAll('.v72SystemStepRow')].map((r,i)=>({id:r.dataset.id,title:r.querySelector('[data-f="title"]').value.trim(),standardMinutes:Math.max(0,v72Num(r.querySelector('[data-f="minutes"]').value,15)),order:i+1})).filter(s=>s.title);
  if(!steps.length)return alert('حداقل یک مرحله برای سیستم تعریف کن.');
  const old=v72System(sid),now=v72Now(),projectId=document.getElementById('v72SystemProject').value,goal=v72Goal(goalId);
  const row={...(old||{}),id:sid||v72Uid('system'),name,goalId,projectId,areaId:goal?.areaId||'',type:document.getElementById('v72SystemType').value,frequency:document.getElementById('v72SystemFrequency').value,frequencyCount:Math.max(1,v72Num(document.getElementById('v72SystemFrequencyCount').value,1)),priority:document.getElementById('v72SystemPriority').value,standardMinutes:Math.max(0,v72Num(document.getElementById('v72SystemMinutes').value)),targetAdherence:v72Clamp(document.getElementById('v72SystemAdherence').value),nextRunDate,expectedResult:document.getElementById('v72SystemResult').value.trim(),description:document.getElementById('v72SystemDesc').value.trim(),active:document.getElementById('v72SystemActive').checked,steps,createdAt:old?.createdAt||now,updatedAt:now,lastRunAt:old?.lastRunAt||''};
  const i=S.systems.findIndex(x=>x.id===row.id);i>=0?S.systems[i]=row:S.systems.unshift(row);
  save();v72CloseDialog('v72SystemDialog');render();
}
function v76SystemProgress(s){const run=v72ActiveRun(s.id);return run?v72RunProgress(run):v72SystemAdherence(s)}
function v76SystemCard(s){
  const prog=v76SystemProgress(s),run=v72ActiveRun(s.id),block=v72SystemBottleneck(s);
  return `<article class="card v72EntityCard ${block?'red':''}"><div class="v72EntityTop"><div><span class="badge ${s.active!==false?'ok':''}">${s.active!==false?'فعال':'غیرفعال'}</span><span class="badge">${esc(v72Label(V72_SYSTEM_TYPES,s.type))}</span><span class="badge">${esc(v72Label(V72_FREQUENCIES,s.frequency))}</span></div><button onclick="v72OpenSystem('${s.id}')">ویرایش</button></div><div class="v72EntityMain">${v72Ring(prog,run?'پیشرفت اجرا':'پایبندی')}<div><h3>${esc(s.name||'سیستم بدون نام')}</h3><p>هدف: ${esc(v72GoalTitle(s.goalId))}</p><small>${fa((s.steps||[]).length)} مرحله · زمان استاندارد ${fa(s.standardMinutes||0)} دقیقه</small></div></div>${block?`<div class="v72Bottleneck">گلوگاه: مرحله «${esc(block.title)}» در ۳۰ روز اخیر ${fa(block.count)} بار عقب افتاده است.</div>`:''}<div class="v72MiniStats"><span>هدف پایبندی ${fa(s.targetAdherence||80)}٪</span><span>اجرای کامل ${fa(v72SystemRuns(s.id).filter(r=>r.status==='completed').length)}</span><span>${s.nextRunDate?'اجرای بعد '+fa(s.nextRunDate):'بدون زمان‌بندی'}</span></div><div class="bar goalBar"><i style="width:${prog}%"></i></div><div class="v72CardActions"><button class="primary" onclick="v72StartSystem('${s.id}')" ${run?'disabled':''}>${run?'در حال اجرا':'شروع اجرا'}</button><button onclick="v72DuplicateSystem('${s.id}')">کپی سیستم</button></div></article>`;
}
function v76SystemsView(){
  const f=JSON.parse(sessionStorage.v72SystemFilter||'{}'),q=f.q||'',type=f.type||'all',active=f.active||'all';
  let rows=[...S.systems];if(q)rows=rows.filter(s=>JSON.stringify(s).toLowerCase().includes(q.toLowerCase()));if(type!=='all')rows=rows.filter(s=>s.type===type);if(active!=='all')rows=rows.filter(s=>String(s.active!==false)===active);
  rows.sort((a,b)=>(b.active!==false)-(a.active!==false)||(a.name||'').localeCompare(b.name||''));
  const activeCount=S.systems.filter(s=>s.active!==false).length,avg=S.systems.length?v73Avg(S.systems.map(v72SystemAdherence)):0,runs=S.systemRuns.filter(r=>r.status==='active').length,blocks=S.systems.filter(s=>v72SystemBottleneck(s)).length;
  document.getElementById('app').innerHTML=`<section class="grid dash"><div class="c3">${kpi('سیستم فعال',activeCount,'سیستم‌های شخصی',Math.min(100,activeCount*12))}</div><div class="c3">${kpi('پایبندی ۳۰روزه',avg+'٪','میانگین اجرا',avg)}</div><div class="c3">${kpi('اجرای باز',runs,'فرایندهای جاری',Math.min(100,runs*20))}</div><div class="c3">${kpi('گلوگاه',blocks,'سه توقف یا بیشتر',Math.min(100,blocks*30))}</div></section><section class="card"><div class="v72PageHead"><div><h3>سیستم‌ساز شخصی</h3><p class="muted">مراحل، زمان استاندارد، تناوب و ارتباط سیستم با هدف یا پروژه را تعریف کن؛ پیشرفت از اجرای واقعی مراحل سنجیده می‌شود.</p></div><button onclick="v72OpenSystem()" class="primary">+ ساخت سیستم</button></div><div class="toolbar"><label>جست‌وجو<input id="v72sq" value="${esc(q)}"></label><label>نوع<select id="v72st"><option value="all">همه انواع</option>${v72Options(V72_SYSTEM_TYPES,type)}</select></label><label>وضعیت<select id="v72sa"><option value="all">همه</option><option value="true" ${active==='true'?'selected':''}>فعال</option><option value="false" ${active==='false'?'selected':''}>غیرفعال</option></select></label><button id="v72sfilter" class="primary">اعمال</button></div></section>${S.systemRuns.some(r=>r.status==='active')?`<section class="card"><h3>اجراهای جاری</h3><div class="v72RunList">${S.systemRuns.filter(r=>r.status==='active').map(v72RunCard).join('')}</div></section>`:''}<section class="v72CardGrid">${rows.length?rows.map(v76SystemCard).join(''):'<div class="card empty">هنوز سیستمی تعریف نشده است.</div>'}</section>`;
  document.getElementById('v72sfilter').onclick=()=>{sessionStorage.v72SystemFilter=JSON.stringify({q:document.getElementById('v72sq').value.trim(),type:document.getElementById('v72st').value,active:document.getElementById('v72sa').value});render()};
}
v72OpenSystem=v76OpenSystem;window.v72OpenSystem=v72OpenSystem;
v72SaveSystem=v76SaveSystem;window.v72SaveSystem=v72SaveSystem;
v72SystemCard=v76SystemCard;window.v72SystemCard=v72SystemCard;
v72SystemsView=v76SystemsView;window.v72SystemsView=v72SystemsView;

// ===== داشبورد روزانه دایره‌ای و یک کار مهم =====
function v76Daily(){
  const p=S.daily[sel]||{},ts=dayTasks(sel),m=met(ts),remaining=m.tot?Math.round(m.todo/m.tot*100):0,overdue=m.tot?Math.round(m.l/m.tot*100):0;
  const important=p.mostImportant||p.top3?.[0]||'';
  document.getElementById('app').innerHTML=`<section class="card"><div class="toolbar"><label>انتخاب روز<input id="dayInp" value="${sel}"></label><button id="goDay" class="primary">نمایش</button><button onclick="sel='${todayJ()}';render()">امروز</button><button onclick="sel=addDays(sel,-1);render()">روز قبل</button><button onclick="sel=addDays(sel,1);render()">روز بعد</button></div><h3>${showDate(sel)}</h3><div class="v76DailyCircles">${v76Circle('تحقق روز',m.comp,`${fa(m.d)} از ${fa(m.tot)} انجام‌شده`,'green')}${v76Circle('باقی‌مانده',remaining,`${fa(m.todo)} فعالیت فعال`,'red')}${v76Circle('میانگین پیشرفت',m.avg,'بر اساس درصد پیشرفت کارها','blue')}${v76Circle('عقب‌افتاده',overdue,`${fa(m.l)} مورد نیازمند پیگیری`,'orange')}</div></section><section class="card">${rowTitle('تمرکز اصلی روز و مهم‌ترین کار امروز','<button id="saveDay" class="primary">ذخیره تمرکز</button>')}<div class="two"><label>تمرکز اصلی روز<textarea id="focus" placeholder="موضوع اصلی که امروز باید روی آن متمرکز بمانی">${esc(p.focus||'')}</textarea></label><label>مهم‌ترین کار امروز<textarea id="mostImportant" placeholder="کاری که حتی اگر هیچ کار دیگری انجام نشد، باید تمام شود">${esc(important)}</textarea></label></div></section><section class="card">${rowTitle('لیست فعالیت‌های روز',`<button class="primary" onclick="openDlg(null,'${sel}')">+ افزودن فعالیت</button>`)}${taskList(ts)}</section>`;
  document.getElementById('goDay').onclick=()=>{const v=jDate(document.getElementById('dayInp').value);if(!v)return alert('تاریخ شمسی معتبر وارد کنید.');sel=v;mon=v.slice(0,7);wstart=week(v).start;render()};
  document.getElementById('saveDay').onclick=()=>{const old=S.daily[sel]||{},oldTop=Array.isArray(old.top3)?old.top3:['','',''],main=document.getElementById('mostImportant').value.trim();S.daily[sel]={...old,focus:document.getElementById('focus').value.trim(),mostImportant:main,top3:[main,oldTop[1]||'',oldTop[2]||'']};save();render()};
}
daily=v76Daily;window.daily=daily;

// ===== چرخ زندگی بدون KPI =====
function v76GoAreaGoals(areaId){sessionStorage.v72GoalFilter=JSON.stringify({q:'',status:'all',area:areaId});v73Go('goalsV7')}
window.v76GoAreaGoals=v76GoAreaGoals;
function v76AreaCard(a){
  const score=v73AreaScore(a),g=v76AreaGoalScore(a.id),p=v76AreaProjectScore(a.id),s=v76AreaSystemScore(a.id),t=v76AreaTaskScore(a.id);
  return `<article class="card v73AreaCard ${v73Health(score)}"><div class="v73AreaTop">${v73Ring(score,a.title)}<div><h3>${esc(a.title)}</h3><small>وزن در LEVEL UP: ${fa(a.weight)}٪</small></div></div><div class="v73Breakdown"><span>اهداف <b>${g==null?'—':fa(g)+'٪'}</b></span><span>پروژه‌ها <b>${p==null?'—':fa(p)+'٪'}</b></span><span>سیستم‌ها <b>${s==null?'—':fa(s)+'٪'}</b></span><span>فعالیت‌ها <b>${t==null?'—':fa(t)+'٪'}</b></span></div><div class="bar"><i style="width:${score}%"></i></div><button onclick="v76GoAreaGoals('${a.id}')">مشاهده اهداف این حوزه</button></article>`;
}
function v76WheelView(){
  const areas=(S.areas||[]).filter(a=>a.active!==false).sort((a,b)=>(a.order||0)-(b.order||0)),score=v73LevelUpScore();
  document.getElementById('app').innerHTML=`<section class="card v73WheelHero"><div>${v73Ring(score,'LEVEL UP')}</div><div><h3>چرخ زندگی شخصی</h3><p class="muted">امتیاز هر حوزه از پیشرفت اهداف، پروژه‌ها، اجرای سیستم‌ها و فعالیت‌های تکمیل‌شده محاسبه می‌شود.</p><div class="v73WheelActions"><button onclick="v72OpenAreas()">وزن حوزه‌ها</button></div></div></section><section class="card"><canvas id="v73WheelPageCanvas" class="v73WheelCanvas large v76WheelCanvas"></canvas></section><section class="v73AreaGrid">${areas.map(v76AreaCard).join('')||'<div class="card empty">حوزه فعالی وجود ندارد.</div>'}</section>`;
  requestAnimationFrame(()=>v73DrawWheel(document.getElementById('v73WheelPageCanvas')));
}
v73AreaCard=v76AreaCard;window.v73AreaCard=v73AreaCard;
v73WheelView=v76WheelView;window.v73WheelView=v73WheelView;

// ===== مرکز فرماندهی کاربردی و ترتیب ثابت داشبورد =====
function v76MostImportantToday(){
  const p=S.daily?.[todayJ()]||{};
  return p.mostImportant||p.top3?.[0]||(dayTasks(todayJ()).filter(t=>!done(t)&&!canc(t)).sort((a,b)=>v73TaskWeight(b)-v73TaskWeight(a))[0]?.title)||'هنوز مهم‌ترین کار امروز تعیین نشده است.';
}
function v76Dashboard(){
  v73EnsureState();v73CaptureScore();
  const alerts=v73Alerts().filter(a=>a.view!=='financeV7'),critical=alerts.filter(a=>a.level==='red').length;
  const focus=(S.goalsV7||[]).filter(g=>g.status==='focus90').slice(0,3),focusAvg=focus.length?v73Avg(focus.map(v72GoalProgress)):0;
  const systems=(S.systems||[]).filter(s=>s.active!==false),dueSystems=systems.filter(s=>s.nextRunDate&&s.nextRunDate<=todayJ()&&!v72ActiveRun(s.id));
  const riskProjects=(S.projects||[]).filter(p=>p.due&&p.due<todayJ()&&!['completed','cancelled'].includes(p.status));
  const todayRows=dayTasks(todayJ()).filter(t=>!canc(t)),todayScore=v73TaskCompletion(todayRows),important=v76MostImportantToday(),decision=alerts[0];
  document.getElementById('app').innerHTML=`
  <section class="card v76AlertsFirst"><div class="v76SectionTitle"><div><small>اول از همه</small><h3>مرکز هشدار</h3></div><span class="${critical?'dangerBadge':'safeBadge'}">${critical?fa(critical)+' هشدار بحرانی':'وضعیت پایدار'}</span></div>${v73AlertsHtml(alerts)}</section>
  <section class="card v76CommandCenter"><div class="v76CommandHead"><div><small>مرکز فرماندهی اجرایی</small><h3>تصمیم امروز را به اقدام تبدیل کن</h3><p>مهم‌ترین کار، انحراف فوری و مسیر ۹۰روزه در یک نگاه.</p></div><div class="v76CommandActions"><button onclick="v73OpenDailyReview('${todayJ()}')">مرور امروز</button><button onclick="v73OpenWeeklyReview('${week(todayJ()).start}')">مرور هفته</button><button onclick="openDlg(null,'${todayJ()}')" class="primary">+ فعالیت</button></div></div><div class="v76ActionGrid"><article class="primaryAction"><span>مهم‌ترین کار امروز</span><b>${esc(important)}</b><button onclick="v73Go('daily')">تنظیم یا مشاهده</button></article><article><span>تصمیم فوری</span><b>${esc(decision?.title||'هشدار فوری وجود ندارد')}</b><small>${esc(decision?.detail||'روی مهم‌ترین کار امروز تمرکز کن.')}</small>${decision?`<button onclick="v73Go('${decision.view}')">رسیدگی اکنون</button>`:''}</article><article><span>تمرکز ۹۰روزه</span>${v73Ring(focusAvg,'پیشرفت')}<small>${fa(focus.length)} هدف از ۳ هدف</small><button onclick="v73Go('goalsV7')">اهداف حرفه‌ای</button></article><article><span>سیستم و پروژه</span><b>${fa(dueSystems.length)} سیستم موعددار</b><small>${fa(riskProjects.length)} پروژه خارج از مهلت</small><button onclick="v73Go('${dueSystems.length?'systemsV7':'projectsV7'}')">مشاهده اقدام‌ها</button></article></div><div class="v76CommandStrip"><span>تحقق امروز <b>${fa(todayScore)}٪</b></span><span>کار تکمیل‌شده <b>${fa(todayRows.filter(done).length)}</b></span><span>کار باقی‌مانده <b>${fa(todayRows.filter(t=>!done(t)).length)}</b></span><span>LEVEL UP <b>${fa(v73LevelUpScore())}٪</b></span></div></section>
  <section class="card v76WheelDashboard"><div class="v76SectionTitle"><div><small>تعادل و پیشروی</small><h3>چرخ زندگی</h3></div><button onclick="v73Go('wheelV7')">مشاهده جزئیات</button></div><canvas id="v73WheelCanvas" class="v73WheelCanvas v76WheelCanvas"></canvas></section>
  <section class="card v76HeatDashboard"><div class="v76SectionTitle"><div><small>ردپای عملکرد</small><h3>نقشه حرارتی ۹۰ روز اخیر</h3></div></div>${v73Heatmap(90)}</section>
  <section class="grid dash v76DashboardLower"><div class="card c6"><div class="v76SectionTitle"><h3>اهداف تمرکز ۹۰روزه</h3><button onclick="v73Go('goalsV7')">مشاهده</button></div>${v73FocusHtml()}</div><div class="card c6"><div class="v76SectionTitle"><h3>وضعیت سیستم‌ها</h3><button onclick="v73Go('systemsV7')">مشاهده</button></div>${v73SystemsHtml()}</div><div class="card c7"><div class="v76SectionTitle"><h3>فعالیت‌های امروز</h3><button onclick="v73Go('daily')">برنامه روز</button></div>${v73TodayHtml()}</div><div class="card c5"><div class="v76SectionTitle"><h3>روند ۱۴ روزه</h3></div><canvas id="v73Trend" class="chart"></canvas></div></section>`;
  requestAnimationFrame(()=>{v73DrawWheel(document.getElementById('v73WheelCanvas'));const trend=document.getElementById('v73Trend');if(trend)line(trend,Array.from({length:14},(_,i)=>{const d=addDays(todayJ(),i-13);return{label:fa(par(d).jd),value:v73TaskCompletion(dayTasks(d))}}))});
}
v73Dashboard=v76Dashboard;window.v73Dashboard=v73Dashboard;dash=v76Dashboard;window.dash=dash;

// ===== حذف مدیریت مالی از رابط، حفظ وام و اقساط =====
const v76AlertsBase=v73Alerts;
v73Alerts=function(){return v76AlertsBase().filter(a=>a.view!=='financeV7'&&!String(a.title||'').includes('کسری نقدینگی'))};window.v73Alerts=v73Alerts;

function v76DailyDigest(){
  const tasks=dayTasks(todayJ()).filter(t=>!done(t)&&!canc(t)).sort((a,b)=>v73TaskWeight(b)-v73TaskWeight(a)||(a.start||'99:99').localeCompare(b.start||'99:99'));
  const systems=(S.systems||[]).filter(s=>s.active!==false&&s.nextRunDate&&s.nextRunDate<=todayJ()&&!v72ActiveRun(s.id)).length;
  const alerts=v73Alerts().filter(x=>x.level==='red').length,important=v76MostImportantToday();
  return {title:'خلاصه مدیریتی امروز',body:`${fa(tasks.length)} کار فعال؛ ${fa(systems)} سیستم موعددار؛ ${fa(alerts)} هشدار بحرانی. مهم‌ترین کار: ${important}`,text:`📊 خلاصه امروز ${fa(todayJ())}\n\nکارهای فعال: ${fa(tasks.length)}\nسیستم‌های موعددار: ${fa(systems)}\nهشدارهای بحرانی: ${fa(alerts)}\nمهم‌ترین کار امروز: ${important}`};
}
v75DailyDigest=v76DailyDigest;window.v75DailyDigest=v75DailyDigest;

function v76WeeklyReport(start=week(todayJ()).start,force=false){
  const rid=`weekly_${start}`;let row=(S.autoReports||[]).find(r=>r.id===rid);if(row&&!force)return row;
  const a=v73WeeklyAuto(start),review=S.weeklyReviews?.[start]||{},score=v73LevelUpScore(),red=v73Alerts().filter(x=>x.level==='red').length;
  const text=[`📈 گزارش هفتگی Planner for Best Life`,`هفته ${fa(start)} تا ${fa(a.end)}`,'',`تحقق کارها: ${fa(a.completion)}٪`,`انجام‌شده: ${fa(a.done)}`,`عقب‌افتاده: ${fa(a.late)}`,`اجرای سیستم‌ها: ${fa(a.systemCompleted)} از ${fa(a.systemRuns)}`,`پیشرفت اهداف ۹۰روزه: ${fa(a.focus)}٪`,`انرژی میانگین: ${a.energy?fa(a.energy)+'/۵':'ثبت نشده'}`,`LEVEL UP: ${fa(score)}٪`,`هشدار بحرانی: ${fa(red)}`,review.wins?`بردهای هفته: ${review.wins}`:'',review.keyDecision?`تصمیم هفته آینده: ${review.keyDecision}`:''].filter(Boolean).join('\n');
  const now=v75Now(),next={id:rid,type:'weekly',title:`گزارش هفتگی ${fa(start)}`,weekStart:start,weekEnd:a.end,metrics:{...a,levelUp:score,critical:red},text,createdAt:row?.createdAt||now,updatedAt:now};
  if(row)Object.assign(row,next);else S.autoReports.unshift(next);S.autoReports=S.autoReports.slice(0,V75_REPORT_LIMIT);save();return next;
}
v75WeeklyReport=v76WeeklyReport;window.v75WeeklyReport=v75WeeklyReport;

function v76ReportsView(){
  const projects=(S.projects||[]).filter(p=>p.status!=='cancelled');
  document.getElementById('app').innerHTML=`<section class="card v73ReviewHero"><div><h3>گزارش‌ها</h3><p class="muted">خروجی شخصی و پروژه‌ای برای چاپ یا ذخیره PDF.</p></div><button onclick="v73PrintPersonal()" class="primary">گزارش شخصی PDF</button></section><section class="grid dash"><div class="c6 card"><h3>گزارش پروژه</h3><label>انتخاب پروژه<select id="v73ReportProject"><option value="">انتخاب کن...</option>${projects.map(p=>`<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select></label><button style="margin-top:12px" onclick="const v=document.getElementById('v73ReportProject').value;if(v)v73PrintProject(v)">ساخت گزارش پروژه</button></div><div class="c6 card"><h3>خلاصه مدیریتی</h3><div class="v73AutoReport"><div><span>LEVEL UP</span><b>${fa(v73LevelUpScore())}٪</b></div><div><span>اهداف فعال</span><b>${fa(v72ActiveGoalCount())}</b></div><div><span>پروژه فعال</span><b>${fa((S.projects||[]).filter(p=>p.status==='active').length)}</b></div><div><span>سیستم فعال</span><b>${fa((S.systems||[]).filter(s=>s.active!==false).length)}</b></div><div><span>هشدار بحرانی</span><b>${fa(v73Alerts().filter(a=>a.level==='red').length)}</b></div></div></div></section><section class="card v75ReportsSection"><div class="v75SectionHead"><div><h3>گزارش‌های خودکار هفتگی</h3><p class="muted">قابل کپی، اعلان مرورگر و ارسال امن به تلگرام</p></div><button onclick="v75GenerateCurrentReport()" class="primary">ساخت گزارش جاری</button></div>${v75AutoReportsHtml()}</section>`;
}
v73ReportsView=v76ReportsView;window.v73ReportsView=v73ReportsView;

const v76AutomationBase=v75AutomationView;
v75AutomationView=function(){v76AutomationBase();const app=document.getElementById('app');if(app)app.innerHTML=app.innerHTML.replace('از کارها، سیستم‌ها، اهداف، LEVEL UP و وضعیت مالی ساخته می‌شود.','از کارها، سیستم‌ها، اهداف و LEVEL UP ساخته می‌شود.');};window.v75AutomationView=v75AutomationView;
const v76BuildUiBase=v75BuildUi;
v75BuildUi=function(){v76BuildUiBase();document.querySelectorAll('#v75QuickDialog button[onclick*="v75QuickMoney"]').forEach(b=>b.remove())};window.v75BuildUi=v75BuildUi;



// ===== برنامه سالانه بدون KPI/شاخص =====
function v76YearPillar(p){
  return `<div class="task" data-p="${p.id}"><div class="formGrid"><label>عنوان ستون راهبردی<input class="pt" value="${esc(p.title||'')}"></label><label>خروجی مورد انتظار<input class="pg" value="${esc(p.target||'')}"></label><label>درصد پیشرفت<input class="pp" type="number" min="0" max="100" value="${v76Percent(p.progress)}"></label><label class="wide">یادداشت<textarea class="pn">${esc(p.note||'')}</textarea></label></div><button class="danger" onclick="S.year.pillars=S.year.pillars.filter(x=>x.id!=='${p.id}');save();render()">حذف ستون</button></div>`;
}
function v76SaveYear(){
  S.year=S.year||{vision:'',pillars:[]};
  S.year.vision=document.getElementById('vision')?.value.trim()||'';
  const oldById=new Map((S.year.pillars||[]).map(x=>[x.id,x]));
  S.year.pillars=[...document.querySelectorAll('#pillars .task')].map(c=>{
    const old=oldById.get(c.dataset.p)||{};
    return {...old,id:c.dataset.p,title:c.querySelector('.pt')?.value.trim()||'',target:c.querySelector('.pg')?.value.trim()||'',progress:v76Percent(c.querySelector('.pp')?.value),note:c.querySelector('.pn')?.value.trim()||''};
  }).filter(p=>p.title||p.target||p.note||p.progress);
  save();render();
}
function v76Yearly(){
  const yr=yrange(),ts=inRange(yr.start,yr.end),m=met(ts);S.year=S.year||{vision:'',pillars:[]};const p=S.year;
  document.getElementById('app').innerHTML=`<section class="card"><h3>نمای کل سال ${fa(C.year)}</h3><div class="grid dash"><div class="c3">${kpi('تحقق سال',m.comp+'٪',`${m.d} از ${m.tot}`,m.comp)}</div><div class="c3">${kpi('انجام‌شده',m.d,'فعالیت تکمیل‌شده',m.tot?m.d/m.tot*100:0)}</div><div class="c3">${kpi('باقی‌مانده',m.todo,'فعالیت فعال',m.tot?m.todo/m.tot*100:0)}</div><div class="c3">${kpi('عقب‌افتاده',m.l,'نیازمند پیگیری',m.tot?m.l/m.tot*100:0)}</div></div></section><section class="card">${rowTitle('نقشه حرارتی عملکرد سال','<span class="muted">هر خانه یک روز</span>')}<div class="heat">${dates(yr.start,yr.end).map(d=>{const c=met(dayTasks(d)).comp,lv=c>=90?4:c>=65?3:c>=35?2:c>0?1:0;return`<span class="h${lv}" title="${d}: ${c}%"></span>`}).join('')}</div></section><section class="card">${rowTitle('ستون‌های راهبردی سال','<button id="saveYear" class="primary">ذخیره برنامه سالانه</button>')}<label>چشم‌انداز سال<textarea id="vision">${esc(p.vision||'')}</textarea></label><div class="tasks" id="pillars">${(p.pillars||[]).map(v76YearPillar).join('')}</div><button id="addPillar">+ ستون راهبردی جدید</button></section><section class="card">${rowTitle('عملکرد ۱۲ ماه')}<canvas id="ychart" class="chart"></canvas></section>`;
  document.getElementById('addPillar').onclick=()=>{S.year.pillars.push({id:id(),title:'',target:'',progress:0,note:''});save();render()};
  document.getElementById('saveYear').onclick=v76SaveYear;
  bar(document.getElementById('ychart'),monthPerf());
}
yearly=v76Yearly;window.yearly=yearly;saveYear=v76SaveYear;window.saveYear=saveYear;pillar=v76YearPillar;window.pillar=pillar;

// ===== منوی جدید و نام برنامه =====
C.nav=[
  ['dashboard','📊','داشبورد','مرکز فرماندهی زندگی'],
  ['inbox','📥','Inbox','ورودی‌ها / Inbox'],
  ['daily','☀️','روزانه','برنامه روزانه'],
  ['weekly','🗓️','هفتگی','برنامه هفتگی'],
  ['monthly','📅','ماهانه','برنامه ماهانه'],
  ['yearly','🗺️','سالانه','برنامه سالانه'],
  ['tasks','✅','کارها','مدیریت کارها و جست‌وجو'],
  ['goalsV7','🎯','اهداف حرفه‌ای','اهداف حرفه‌ای و تمرکز ۹۰روزه'],
  ['projectsV7','🧩','پروژه‌ها','پروژه‌های متصل به اهداف'],
  ['systemsV7','⚙️','سیستم‌ها','سیستم‌ساز شخصی'],
  ['wheelV7','🧭','چرخ زندگی','چرخ زندگی و امتیاز LEVEL UP'],
  ['loansV7','🏦','وام و اقساط','وام‌ها، بدهی‌ها و تقویم اقساط'],
  ['reviewsV7','📝','مرورها','مرور روزانه و هفتگی'],
  ['automationV7','🔔','اعلان و اتوماسیون','اعلان، ثبت صوتی و گزارش خودکار'],
  ['reportsV7','📄','گزارش‌ها','گزارش‌های شخصی و پروژه‌ای'],
  ['habits','🟩','عادت‌ها','Habit Tracker']
];
function v76Navigate(name){
  if(!C.nav.some(n=>n[0]===name))name='dashboard';
  view=name;const item=C.nav.find(n=>n[0]===name);if(item)document.getElementById('pageTitle').textContent=item[3];
  document.getElementById('v74MoreNavDialog')?.close();buildNav();render();
}
function v76BuildNav(){
  const full=C.nav.map(n=>`<button class="nav ${view===n[0]?'active':''}" data-v="${n[0]}"><span>${n[1]}</span><span>${n[2]}</span></button>`).join('');
  document.getElementById('sideNav').innerHTML=full;
  const primary=['dashboard','daily','monthly','tasks'];
  const bottom=primary.map(k=>C.nav.find(n=>n[0]===k)).filter(Boolean).map(n=>`<button class="nav ${view===n[0]?'active':''}" data-v="${n[0]}"><span>${n[1]}</span><span>${n[2]}</span></button>`).join('')+`<button class="nav" id="v74MoreNavBtn"><span>☰</span><span>بیشتر</span></button>`;
  document.getElementById('bottomNav').innerHTML=bottom;
  document.querySelectorAll('#sideNav .nav[data-v],#bottomNav .nav[data-v]').forEach(b=>b.onclick=()=>v76Navigate(b.dataset.v));
  const more=document.getElementById('v74MoreNavBtn');if(more)more.onclick=()=>{const grid=document.getElementById('v74MoreNavGrid');if(grid)grid.innerHTML=C.nav.filter(n=>!primary.includes(n[0])).map(n=>`<button type="button" onclick="v76Navigate('${n[0]}')"><span>${n[1]}</span><b>${n[2]}</b></button>`).join('');document.getElementById('v74MoreNavDialog')?.showModal()};
}
v74Navigate=v76Navigate;window.v74Navigate=v74Navigate;window.v76Navigate=v76Navigate;
buildNav=v76BuildNav;window.buildNav=buildNav;

function v76Rename(){
  document.title='Planner for Best Life 7.6';
  const brand=document.querySelector('.brand h1');if(brand)brand.textContent='Planner for Best Life';
  const sub=document.querySelector('.brand p');if(sub)sub.textContent='سیستم یکپارچه زندگی، هدف و اقدام';
  const label=document.getElementById('calendarLabel');if(label)label.textContent='Planner for Best Life 7.6 · مرکز فرماندهی زندگی';
  document.querySelectorAll('#v75QuickDialog button[onclick*="v75QuickMoney"]').forEach(b=>b.remove());
}
function v76Init(){
  v76EnsureState();v76StripKpiUi();v75BuildUi();v76Rename();
  if(!C.nav.some(n=>n[0]===view))view='dashboard';
  buildNav();render();v76Rename();setTimeout(v76Rename,0);
}
v76Init();
