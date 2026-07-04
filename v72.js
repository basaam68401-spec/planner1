'use strict';

// ===== Planner Life OS 7.3 =====
// اهداف حرفه‌ای، پروژه‌های متصل و سیستم‌ساز شخصی.
const V72_SCHEMA = 'planner-life-os-v7.3';
const V72_ACTIVE_GOAL_LIMIT = 7;
const V72_FOCUS_GOAL_LIMIT = 3;
const V72_BOTTLENECK_LIMIT = 3;

const V72_GOAL_STATUSES = [
  ['draft','پیش‌نویس'],['active','فعال'],['focus90','تمرکز ۹۰روزه'],['waiting','در انتظار'],
  ['paused','متوقف‌شده'],['someday','فعلاً نه'],['completed','تکمیل‌شده'],['archived','بایگانی‌شده']
];
const V72_PROJECT_STATUSES = [
  ['planning','برنامه‌ریزی'],['active','فعال'],['paused','متوقف'],['waiting','منتظر دیگران'],['completed','تکمیل‌شده'],['cancelled','لغوشده']
];
const V72_SYSTEM_TYPES = [
  ['routine','روتین'],['process','فرایندی'],['trigger','محرک‌محور'],['periodic','دوره‌ای']
];
const V72_FREQUENCIES = [
  ['manual','دستی'],['daily','روزانه'],['weekly','هفتگی'],['monthly','ماهانه'],['trigger','پس از محرک']
];
const V72_PROJECT_TEMPLATES = {
  blank:{title:'پروژه خالی',type:'سفارشی',output:'',success:'',description:''},
  book:{title:'تألیف کتاب',type:'کتاب',output:'نسخه نهایی آماده انتشار',success:'تکمیل نگارش، ویرایش و آماده‌سازی انتشار',description:'پروژه تألیف و تکمیل یک کتاب تخصصی'},
  article:{title:'مقاله علمی',type:'مقاله',output:'مقاله ارسال‌شده یا پذیرفته‌شده',success:'تکمیل متن و ارسال به مجله هدف',description:'پروژه تدوین، بازبینی و ارسال مقاله علمی'},
  patent:{title:'ثبت اختراع',type:'اختراع',output:'ثبت نهایی پرونده اختراع',success:'تکمیل مستندات و دریافت نتیجه رسمی',description:'پروژه آماده‌سازی و پیگیری ثبت اختراع'},
  ept:{title:'آمادگی آزمون EPT',type:'آموزشی',output:'قبولی در آزمون EPT',success:'رسیدن به نمره قبولی در آزمون اصلی',description:'برنامه متمرکز مطالعه و آزمون‌های شبیه‌سازی‌شده'},
  comprehensive:{title:'آزمون جامع دکترا',type:'آموزشی',output:'قبولی در آزمون جامع',success:'تکمیل منابع و قبولی نهایی',description:'پروژه آماده‌سازی برای آزمون جامع دکترا'},
  hse_manager:{title:'ارتقای جایگاه مدیر HSE',type:'سازمانی',output:'انتصاب به سمت مدیر HSE',success:'کسب آمادگی، اعتبار و تصمیم سازمانی لازم',description:'پروژه توسعه شایستگی و جایگاه سازمانی برای مدیریت HSE'},
  global_talent:{title:'پرونده Global Talent بریتانیا',type:'مهاجرت',output:'تکمیل و ارسال پرونده',success:'آماده‌شدن شواهد، توصیه‌نامه‌ها و ثبت درخواست',description:'پروژه آماده‌سازی پرونده مهاجرت از مسیر Global Talent'},
  course:{title:'تولید دوره آموزشی',type:'دوره',output:'دوره آماده عرضه',success:'تکمیل محتوا، ضبط و انتشار',description:'پروژه طراحی و تولید یک دوره آموزشی حرفه‌ای'},
  org_hse:{title:'پروژه سازمانی HSE',type:'سازمانی',output:'خروجی اجرایی مورد تأیید',success:'تحویل خروجی و اخذ تأیید ذی‌نفعان',description:'پروژه اجرایی یا راهبردی در حوزه HSE'},
  content:{title:'محتوای حرفه‌ای',type:'محتوا',output:'محتوای نهایی منتشرشده',success:'تولید و انتشار در زمان برنامه‌ریزی‌شده',description:'پروژه تولید یک محتوای تخصصی حرفه‌ای'}
};

function v72Now(){ return new Date().toISOString(); }
function v72Clone(x){ return x == null ? x : JSON.parse(JSON.stringify(x)); }
function v72Num(v,fallback=0){ const n=Number(v); return Number.isFinite(n)?n:fallback; }
function v72Clamp(v,a=0,b=100){ return Math.max(a,Math.min(b,v72Num(v))); }
function v72Label(list,value){ return list.find(x=>x[0]===value)?.[1] || value || '—'; }
function v72Uid(prefix='v72'){ return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`; }
function v72DateDiff(a,b){ try{return Math.round((jToDate(b)-jToDate(a))/86400000)}catch(_){return 0} }
function v72PersianMoney(v){ return fa(Math.round(v72Num(v)).toLocaleString('en-US'))+' تومان'; }

function v72DefaultAreas(){
  return [
    {id:'area_brand',title:'برند شخصی و مرجعیت حرفه‌ای',weight:17,active:true,order:1},
    {id:'area_business',title:'کسب‌وکار، درآمد و ثروت',weight:17,active:true,order:2},
    {id:'area_health',title:'سلامت و انرژی',weight:15,active:true,order:3},
    {id:'area_org',title:'جایگاه سازمانی و اثرگذاری',weight:14,active:true,order:4},
    {id:'area_science',title:'علم، دکترا و اعتبار بین‌المللی',weight:13,active:true,order:5},
    {id:'area_migration',title:'مهاجرت و آینده زندگی',weight:10,active:true,order:6},
    {id:'area_relations',title:'خانواده، روابط و شبکه‌سازی',weight:8,active:true,order:7},
    {id:'area_growth',title:'رشد فردی و مهارت‌ها',weight:6,active:true,order:8}
  ].map(x=>({...x,createdAt:v72Now(),updatedAt:v72Now()}));
}

function v72EnsureState(){
  if(!Array.isArray(S.areas)||!S.areas.length) S.areas=v72DefaultAreas();
  S.goalsV7=Array.isArray(S.goalsV7)?S.goalsV7:[];
  S.projects=Array.isArray(S.projects)?S.projects:[];
  S.systems=Array.isArray(S.systems)?S.systems:[];
  S.systemRuns=Array.isArray(S.systemRuns)?S.systemRuns:[];
  S.meta=S.meta||{};
  S.meta.schemaVersion=V72_SCHEMA;
  S.settingsV7=S.settingsV7||{};
  S.settingsV7.goalLimits={active:V72_ACTIVE_GOAL_LIMIT,focus90:V72_FOCUS_GOAL_LIMIT};
  S.settingsV7.bottleneckLimit=V72_BOTTLENECK_LIMIT;
  for(const a of S.areas){a.updatedAt=a.updatedAt||a.createdAt||v72Now();a.active=a.active!==false;}
  for(const g of S.goalsV7){
    g.status=g.status||'draft';g.steps=Array.isArray(g.steps)?g.steps:[];g.kpis=Array.isArray(g.kpis)?g.kpis:[];
    g.stepWeight=v72Clamp(g.stepWeight??40);g.kpiWeight=v72Clamp(g.kpiWeight??60);g.manualProgress=v72Clamp(g.manualProgress||0);
    g.updatedAt=g.updatedAt||g.createdAt||v72Now();
  }
  for(const p of S.projects){
    p.status=p.status||'planning';p.contributions=p.contributions||{};p.progressMode=p.progressMode||'combo';p.manualProgress=v72Clamp(p.manualProgress||0);
    p.updatedAt=p.updatedAt||p.createdAt||v72Now();
  }
  for(const sy of S.systems){
    sy.steps=Array.isArray(sy.steps)?sy.steps:[];sy.type=sy.type||'routine';sy.frequency=sy.frequency||'manual';sy.active=sy.active!==false;
    sy.updatedAt=sy.updatedAt||sy.createdAt||v72Now();
  }
  for(const r of S.systemRuns){r.steps=Array.isArray(r.steps)?r.steps:[];r.updatedAt=r.updatedAt||r.createdAt||v72Now();}
  localStorage.setItem(K,JSON.stringify(S));
  window.S=S;
}

function v72Area(id){ return S.areas.find(a=>a.id===id); }
function v72Goal(id){ return S.goalsV7.find(g=>g.id===id); }
function v72Project(id){ return S.projects.find(p=>p.id===id); }
function v72System(id){ return S.systems.find(s=>s.id===id); }
function v72AreaTitle(id){ return v72Area(id)?.title||'بدون حوزه'; }
function v72GoalTitle(id){ return v72Goal(id)?.title||'بدون هدف'; }
function v72ProjectTitle(id){ return v72Project(id)?.title||'بدون پروژه'; }
function v72ActiveGoalCount(exclude=''){ return S.goalsV7.filter(g=>g.id!==exclude&&['active','focus90'].includes(g.status)).length; }
function v72FocusGoalCount(exclude=''){ return S.goalsV7.filter(g=>g.id!==exclude&&g.status==='focus90').length; }

function v72StepProgress(goal){
  const steps=(goal.steps||[]).filter(s=>s.title?.trim());
  return steps.length?Math.round(steps.filter(s=>s.done).length/steps.length*100):null;
}
function v72KpiProgress(goal){
  const kpis=(goal.kpis||[]).filter(k=>v72Num(k.target)>0);
  if(!kpis.length)return null;
  let total=0,weights=0;
  for(const k of kpis){const w=Math.max(0.01,v72Num(k.weight,1));total+=v72Clamp(v72Num(k.current)/v72Num(k.target)*100)*w;weights+=w;}
  return Math.round(total/weights);
}
function v72GoalProgress(goal){
  if(goal.status==='completed')return 100;
  const sp=v72StepProgress(goal),kp=v72KpiProgress(goal),sw=v72Clamp(goal.stepWeight??40),kw=v72Clamp(goal.kpiWeight??60);
  if(sp==null&&kp==null)return v72Clamp(goal.manualProgress||0);
  if(sp==null)return kp;
  if(kp==null)return sp;
  const total=sw+kw||100;
  return Math.round((sp*sw+kp*kw)/total);
}
function v72GoalHealth(goal){
  if(goal.status==='completed')return 'green';
  if(['paused','someday','archived'].includes(goal.status))return 'neutral';
  const p=v72GoalProgress(goal);
  if(goal.due){
    const days=v72DateDiff(todayJ(),goal.due);
    if(days<0)return 'red';
    if(days<=14&&p<80)return 'yellow';
  }
  return p>=70?'green':p>=35?'yellow':'red';
}
function v72LinkedTasks(projectId){ return S.tasks.filter(t=>t.projectId===projectId); }
function v72ProjectProgress(project){
  if(project.status==='completed')return 100;
  const tasks=v72LinkedTasks(project.id).filter(t=>t.status!=='لغو شده');
  const tp=tasks.length?Math.round(tasks.filter(done).length/tasks.length*100):null;
  const mp=v72Clamp(project.manualProgress||0);
  if(project.progressMode==='tasks')return tp==null?0:tp;
  if(project.progressMode==='manual')return mp;
  return tp==null?mp:Math.round((tp+mp)/2);
}
function v72ContributionScore(project){
  const c=project.contributions||{};
  return ['financial','credibility','scientific','organizational','international'].reduce((sum,k)=>sum+v72Clamp(c[k]||0,0,5),0);
}
function v72SystemRuns(systemId){ return S.systemRuns.filter(r=>r.systemId===systemId); }
function v72ActiveRun(systemId){ return S.systemRuns.find(r=>r.systemId===systemId&&r.status==='active'); }
function v72RunProgress(run){ const all=run?.steps||[];return all.length?Math.round(all.filter(s=>s.status==='completed').length/all.length*100):0; }
function v72SystemAdherence(system){
  const since=Date.now()-30*86400000;
  const completed=v72SystemRuns(system.id).filter(r=>r.status==='completed'&&Date.parse(r.completedAt||r.updatedAt)>=since).length;
  let expected=1;
  if(system.frequency==='daily')expected=30;
  if(system.frequency==='weekly')expected=Math.max(1,v72Num(system.frequencyCount,1))*4;
  if(system.frequency==='monthly')expected=1;
  if(system.frequency==='manual'||system.frequency==='trigger'){
    const runs=v72SystemRuns(system.id).filter(r=>Date.parse(r.startedAt||r.createdAt)>=since);
    return runs.length?Math.round(runs.filter(r=>r.status==='completed').length/runs.length*100):0;
  }
  return Math.min(100,Math.round(completed/expected*100));
}
function v72SystemBottleneck(system){
  const since=Date.now()-30*86400000;
  const counts={};
  for(const t of S.tasks){
    if(t.systemId!==system.id||!t.systemStepId||Date.parse(t.createdAt||0)<since)continue;
    if(late(t))counts[t.systemStepId]=(counts[t.systemStepId]||0)+1;
  }
  const best=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  if(!best||best[1]<V72_BOTTLENECK_LIMIT)return null;
  return {stepId:best[0],count:best[1],title:system.steps.find(s=>s.id===best[0])?.title||'مرحله نامشخص'};
}
function v72NextRunDate(system,base=todayJ()){
  if(system.frequency==='daily')return addDays(base,1);
  if(system.frequency==='weekly')return addDays(base,7);
  if(system.frequency==='monthly'){
    const p=par(base),nm=p.jm===12?1:p.jm+1,ny=p.jm===12?p.jy+1:p.jy;
    return fmt(ny,nm,Math.min(p.jd,ml(ny,nm)));
  }
  return '';
}

function v72Ring(value,label=''){
  const p=v72Clamp(value);
  return `<div class="v72Ring" style="--p:${p}"><div><b>${fa(p)}٪</b><small>${esc(label)}</small></div></div>`;
}
function v72HealthBadge(health){
  const map={green:['در مسیر','v72Green'],yellow:['نیازمند توجه','v72Yellow'],red:['خارج از مسیر','v72Red'],neutral:['غیرفعال','v72Neutral']};
  const x=map[health]||map.neutral;return `<span class="badge ${x[1]}">${x[0]}</span>`;
}
function v72Options(list,current){return list.map(([v,l])=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(l)}</option>`).join('')}
function v72AreaOptions(current='',includeInactive=false){return S.areas.filter(a=>includeInactive||a.active!==false).sort((a,b)=>(a.order||0)-(b.order||0)).map(a=>`<option value="${a.id}" ${a.id===current?'selected':''}>${esc(a.title)}</option>`).join('')}
function v72GoalOptions(current='',allowBlank=true){const arr=S.goalsV7.filter(g=>g.id===current||!['archived','completed'].includes(g.status));return `${allowBlank?'<option value="">انتخاب هدف...</option>':''}${arr.map(g=>`<option value="${g.id}" ${g.id===current?'selected':''}>${esc(g.title||'هدف بدون عنوان')}</option>`).join('')}`}
function v72ProjectOptions(current='',goalId='',allowBlank=true){const arr=S.projects.filter(p=>(!goalId||p.goalId===goalId)&&(p.id===current||!['completed','cancelled'].includes(p.status)));return `${allowBlank?'<option value="">بدون پروژه</option>':''}${arr.map(p=>`<option value="${p.id}" ${p.id===current?'selected':''}>${esc(p.title||'پروژه بدون عنوان')}</option>`).join('')}`}
function v72SystemOptions(current='',allowBlank=true){const arr=S.systems.filter(s=>s.id===current||s.active!==false);return `${allowBlank?'<option value="">بدون سیستم</option>':''}${arr.map(s=>`<option value="${s.id}" ${s.id===current?'selected':''}>${esc(s.name||'سیستم بدون نام')}</option>`).join('')}`}

// ===== منو و مسیرهای جدید =====
C.nav=[
  ['dashboard','📊','داشبورد','داشبورد مدیریتی'],['inbox','📥','Inbox','ورودی‌ها / Inbox'],
  ['daily','☀️','روزانه','برنامه روزانه'],['weekly','🗓️','هفتگی','برنامه هفتگی'],['monthly','📅','ماهانه','برنامه ماهانه'],
  ['goalsV7','🎯','اهداف حرفه‌ای','اهداف حرفه‌ای و تمرکز ۹۰روزه'],['projectsV7','🧩','پروژه‌ها','پروژه‌های متصل به اهداف'],
  ['systemsV7','⚙️','سیستم‌ها','سیستم‌ساز شخصی'],['habits','🟩','عادت‌ها','Habit Tracker'],
  ['yearly','🗺️','سالانه','برنامه سالانه'],['goals','📦','اهداف قبلی','اهداف نسخه قبلی'],['tasks','✅','کارها','مدیریت کارها و جست‌وجو']
];

const v72RenderBase=render;
render=function(){
  if(view==='goalsV7'){v72GoalsView();return}
  if(view==='projectsV7'){v72ProjectsView();return}
  if(view==='systemsV7'){v72SystemsView();return}
  return v72RenderBase();
};
window.render=render;

// ===== داشبورد ۷.۲ =====
const v72DashBase=dash;
dash=function(){
  v72DashBase();
  const app=document.getElementById('app');if(!app)return;
  const focus=S.goalsV7.filter(g=>g.status==='focus90').slice(0,3);
  const activeProjects=S.projects.filter(p=>p.status==='active').length;
  const activeSystems=S.systems.filter(s=>s.active!==false).length;
  const blocked=S.systems.map(v72SystemBottleneck).filter(Boolean).length;
  const avg=focus.length?Math.round(focus.reduce((s,g)=>s+v72GoalProgress(g),0)/focus.length):0;
  const html=`<section class="card v72Command"><div class="v72CommandHead"><div><h3>مرکز فرماندهی اهداف و سیستم‌ها</h3><p class="muted">اتصال هدف ← پروژه ← سیستم ← فعالیت روزانه</p></div><div class="v72CommandActions"><button onclick="v72OpenGoal()" class="primary">+ هدف</button><button onclick="v72OpenProject()">+ پروژه</button><button onclick="v72OpenSystem()">+ سیستم</button></div></div><div class="v72QuickStats"><div><span>اهداف فعال</span><b>${fa(v72ActiveGoalCount())}/${fa(V72_ACTIVE_GOAL_LIMIT)}</b></div><div><span>تمرکز ۹۰روزه</span><b>${fa(focus.length)}/${fa(V72_FOCUS_GOAL_LIMIT)}</b></div><div><span>پروژه‌های فعال</span><b>${fa(activeProjects)}</b></div><div><span>سیستم‌های فعال</span><b>${fa(activeSystems)}</b></div><div><span>گلوگاه‌ها</span><b>${fa(blocked)}</b></div></div>${focus.length?`<div class="v72FocusStrip">${focus.map(g=>`<button onclick="view='goalsV7';buildNav();render()">${v72Ring(v72GoalProgress(g),g.title)}</button>`).join('')}</div>`:`<div class="empty">هنوز هدف ۹۰روزه‌ای تعیین نشده است. حداکثر سه هدف تمرکز انتخاب کن.</div>`}</section>`;
  app.insertAdjacentHTML('afterbegin',html);
};
window.dash=dash;

// ===== صفحه اهداف =====
function v72GoalsView(){
  const f=JSON.parse(sessionStorage.v72GoalFilter||'{}'),q=f.q||'',status=f.status||'all',area=f.area||'all';
  let rows=[...S.goalsV7];
  if(q)rows=rows.filter(g=>JSON.stringify(g).toLowerCase().includes(q.toLowerCase()));
  if(status!=='all')rows=rows.filter(g=>g.status===status);
  if(area!=='all')rows=rows.filter(g=>g.areaId===area);
  rows.sort((a,b)=>{const rank={focus90:0,active:1,waiting:2,draft:3,paused:4,someday:5,completed:6,archived:7};return (rank[a.status]??9)-(rank[b.status]??9)||(a.due||'9999').localeCompare(b.due||'9999')});
  const active=v72ActiveGoalCount(),focus=v72FocusGoalCount(),avg=S.goalsV7.length?Math.round(S.goalsV7.reduce((s,g)=>s+v72GoalProgress(g),0)/S.goalsV7.length):0;
  const red=S.goalsV7.filter(g=>v72GoalHealth(g)==='red'&&['active','focus90'].includes(g.status)).length;
  document.getElementById('app').innerHTML=`
  <section class="grid dash"><div class="c3">${kpi('اهداف فعال',`${active}/${V72_ACTIVE_GOAL_LIMIT}`,'سقف تمرکز فعال',active/V72_ACTIVE_GOAL_LIMIT*100)}</div><div class="c3">${kpi('تمرکز ۹۰روزه',`${focus}/${V72_FOCUS_GOAL_LIMIT}`,'پیروزی‌های اصلی',focus/V72_FOCUS_GOAL_LIMIT*100)}</div><div class="c3">${kpi('میانگین پیشرفت',avg+'٪','همه اهداف',avg)}</div><div class="c3">${kpi('خارج از مسیر',red,'نیازمند تصمیم',Math.min(100,red*25))}</div></section>
  <section class="card"><div class="v72PageHead"><div><h3>اهداف حرفه‌ای</h3><p class="muted">اهداف نامحدود ذخیره می‌شوند؛ حداکثر ۷ هدف فعال و ۳ هدف تمرکز ۹۰روزه.</p></div><div><button onclick="v72OpenAreas()">مدیریت حوزه‌ها</button> <button onclick="v72ImportLegacyGoals()">انتقال اهداف قبلی</button> <button onclick="v72OpenGoal()" class="primary">+ هدف جدید</button></div></div><div class="toolbar"><label>جست‌وجو<input id="v72gq" value="${esc(q)}"></label><label>وضعیت<select id="v72gs"><option value="all">همه وضعیت‌ها</option>${v72Options(V72_GOAL_STATUSES,status)}</select></label><label>حوزه<select id="v72ga"><option value="all">همه حوزه‌ها</option>${v72AreaOptions(area)}</select></label><button id="v72gfilter" class="primary">اعمال</button></div></section>
  <section class="v72CardGrid">${rows.length?rows.map(v72GoalCard).join(''):'<div class="card empty">هدفی با این فیلتر پیدا نشد.</div>'}</section>`;
  document.getElementById('v72gfilter').onclick=()=>{sessionStorage.v72GoalFilter=JSON.stringify({q:document.getElementById('v72gq').value.trim(),status:document.getElementById('v72gs').value,area:document.getElementById('v72ga').value});render()};
}
function v72GoalCard(g){
  const p=v72GoalProgress(g),health=v72GoalHealth(g),projects=S.projects.filter(x=>x.goalId===g.id).length,systems=S.systems.filter(x=>x.goalId===g.id).length;
  const due=g.due?fa(g.due):'بدون مهلت';
  return `<article class="card v72EntityCard ${health}"><div class="v72EntityTop"><div>${v72HealthBadge(health)} <span class="badge">${esc(v72Label(V72_GOAL_STATUSES,g.status))}</span></div><button onclick="v72OpenGoal('${g.id}')">ویرایش</button></div><div class="v72EntityMain">${v72Ring(p,'پیشرفت')}<div><h3>${esc(g.title||'هدف بدون عنوان')}</h3><p>${esc(v72AreaTitle(g.areaId))}</p><small>مهلت: ${due}</small></div></div>${g.result?`<p class="v72Result">نتیجه مطلوب: ${esc(g.result)}</p>`:''}<div class="v72MiniStats"><span>${fa((g.steps||[]).filter(s=>s.done).length)}/${fa((g.steps||[]).length)} گام</span><span>${fa((g.kpis||[]).length)} KPI</span><span>${fa(projects)} پروژه</span><span>${fa(systems)} سیستم</span></div><div class="bar goalBar"><i style="width:${p}%"></i></div></article>`;
}

// ===== صفحه پروژه‌ها =====
function v72ProjectsView(){
  const f=JSON.parse(sessionStorage.v72ProjectFilter||'{}'),q=f.q||'',status=f.status||'all',goal=f.goal||'all';
  let rows=[...S.projects];
  if(q)rows=rows.filter(p=>JSON.stringify(p).toLowerCase().includes(q.toLowerCase()));
  if(status!=='all')rows=rows.filter(p=>p.status===status);
  if(goal!=='all')rows=rows.filter(p=>p.goalId===goal);
  rows.sort((a,b)=>{const r={active:0,planning:1,waiting:2,paused:3,completed:4,cancelled:5};return (r[a.status]??9)-(r[b.status]??9)||(a.due||'9999').localeCompare(b.due||'9999')});
  const active=S.projects.filter(p=>p.status==='active').length,planning=S.projects.filter(p=>p.status==='planning').length;
  const avg=S.projects.length?Math.round(S.projects.reduce((s,p)=>s+v72ProjectProgress(p),0)/S.projects.length):0;
  const value=S.projects.reduce((s,p)=>s+v72ContributionScore(p),0);
  document.getElementById('app').innerHTML=`<section class="grid dash"><div class="c3">${kpi('پروژه فعال',active,'در حال اجرا',Math.min(100,active*15))}</div><div class="c3">${kpi('در برنامه‌ریزی',planning,'آماده شروع',Math.min(100,planning*15))}</div><div class="c3">${kpi('میانگین پیشرفت',avg+'٪','همه پروژه‌ها',avg)}</div><div class="c3">${kpi('امتیاز آورده',value,'مجموع پنج نوع آورده',Math.min(100,value))}</div></section><section class="card"><div class="v72PageHead"><div><h3>پروژه‌های متصل به اهداف</h3><p class="muted">هر پروژه الزاماً به یک هدف متصل است تا از پراکندگی جلوگیری شود.</p></div><button onclick="v72OpenProject()" class="primary">+ پروژه جدید</button></div><div class="toolbar"><label>جست‌وجو<input id="v72pq" value="${esc(q)}"></label><label>وضعیت<select id="v72ps"><option value="all">همه وضعیت‌ها</option>${v72Options(V72_PROJECT_STATUSES,status)}</select></label><label>هدف<select id="v72pg"><option value="all">همه اهداف</option>${v72GoalOptions(goal,false)}</select></label><button id="v72pfilter" class="primary">اعمال</button></div></section><section class="v72CardGrid">${rows.length?rows.map(v72ProjectCard).join(''):'<div class="card empty">پروژه‌ای ثبت نشده است.</div>'}</section>`;
  document.getElementById('v72pfilter').onclick=()=>{sessionStorage.v72ProjectFilter=JSON.stringify({q:document.getElementById('v72pq').value.trim(),status:document.getElementById('v72ps').value,goal:document.getElementById('v72pg').value});render()};
}
function v72ProjectCard(p){
  const prog=v72ProjectProgress(p),tasks=v72LinkedTasks(p.id),score=v72ContributionScore(p),goal=v72Goal(p.goalId);
  return `<article class="card v72EntityCard"><div class="v72EntityTop"><div><span class="badge ${p.status==='active'?'ok':''}">${esc(v72Label(V72_PROJECT_STATUSES,p.status))}</span><span class="badge">${esc(p.type||'سفارشی')}</span></div><button onclick="v72OpenProject('${p.id}')">ویرایش</button></div><div class="v72EntityMain">${v72Ring(prog,'پیشرفت')}<div><h3>${esc(p.title||'پروژه بدون عنوان')}</h3><p>هدف: ${esc(goal?.title||'نامشخص')}</p><small>مهلت: ${p.due?fa(p.due):'بدون مهلت'}</small></div></div>${p.output?`<p class="v72Result">خروجی نهایی: ${esc(p.output)}</p>`:''}<div class="v72MiniStats"><span>${fa(tasks.filter(done).length)}/${fa(tasks.length)} کار</span><span>آورده ${fa(score)}/۲۵</span><span>اهمیت ${fa(p.importance||3)}/۵</span>${p.budget?`<span>${v72PersianMoney(p.budget)}</span>`:''}</div><div class="bar goalBar"><i style="width:${prog}%"></i></div><div class="v72CardActions"><button onclick="v72CreateTaskForProject('${p.id}')">+ کار مرتبط</button><button onclick="v72OpenProjectTasks('${p.id}')">مشاهده کارها</button></div></article>`;
}

// ===== صفحه سیستم‌ها =====
function v72SystemsView(){
  const f=JSON.parse(sessionStorage.v72SystemFilter||'{}'),q=f.q||'',type=f.type||'all',active=f.active||'all';
  let rows=[...S.systems];
  if(q)rows=rows.filter(s=>JSON.stringify(s).toLowerCase().includes(q.toLowerCase()));
  if(type!=='all')rows=rows.filter(s=>s.type===type);
  if(active!=='all')rows=rows.filter(s=>String(s.active!==false)===active);
  rows.sort((a,b)=>(b.active!==false)-(a.active!==false)||(a.name||'').localeCompare(b.name||''));
  const activeCount=S.systems.filter(s=>s.active!==false).length;
  const avg=S.systems.length?Math.round(S.systems.reduce((sum,s)=>sum+v72SystemAdherence(s),0)/S.systems.length):0;
  const runs=S.systemRuns.filter(r=>r.status==='active').length;
  const blocks=S.systems.filter(s=>v72SystemBottleneck(s)).length;
  document.getElementById('app').innerHTML=`<section class="grid dash"><div class="c3">${kpi('سیستم فعال',activeCount,'سیستم‌های شخصی',Math.min(100,activeCount*12))}</div><div class="c3">${kpi('پایبندی ۳۰روزه',avg+'٪','میانگین اجرا',avg)}</div><div class="c3">${kpi('اجرای باز',runs,'فرایندهای جاری',Math.min(100,runs*20))}</div><div class="c3">${kpi('گلوگاه',blocks,'سه توقف یا بیشتر',Math.min(100,blocks*30))}</div></section><section class="card"><div class="v72PageHead"><div><h3>سیستم‌ساز شخصی</h3><p class="muted">سیستم را خودت تعریف کن؛ مراحل، زمان استاندارد، تناوب و ارتباط آن با هدف یا پروژه قابل تنظیم است.</p></div><button onclick="v72OpenSystem()" class="primary">+ ساخت سیستم</button></div><div class="toolbar"><label>جست‌وجو<input id="v72sq" value="${esc(q)}"></label><label>نوع<select id="v72st"><option value="all">همه انواع</option>${v72Options(V72_SYSTEM_TYPES,type)}</select></label><label>وضعیت<select id="v72sa"><option value="all">همه</option><option value="true" ${active==='true'?'selected':''}>فعال</option><option value="false" ${active==='false'?'selected':''}>غیرفعال</option></select></label><button id="v72sfilter" class="primary">اعمال</button></div></section>${S.systemRuns.some(r=>r.status==='active')?`<section class="card"><h3>اجراهای جاری</h3><div class="v72RunList">${S.systemRuns.filter(r=>r.status==='active').map(v72RunCard).join('')}</div></section>`:''}<section class="v72CardGrid">${rows.length?rows.map(v72SystemCard).join(''):'<div class="card empty">هنوز سیستمی تعریف نشده است.</div>'}</section>`;
  document.getElementById('v72sfilter').onclick=()=>{sessionStorage.v72SystemFilter=JSON.stringify({q:document.getElementById('v72sq').value.trim(),type:document.getElementById('v72st').value,active:document.getElementById('v72sa').value});render()};
}
function v72SystemCard(s){
  const adh=v72SystemAdherence(s),run=v72ActiveRun(s.id),block=v72SystemBottleneck(s);
  return `<article class="card v72EntityCard ${block?'red':''}"><div class="v72EntityTop"><div><span class="badge ${s.active!==false?'ok':''}">${s.active!==false?'فعال':'غیرفعال'}</span><span class="badge">${esc(v72Label(V72_SYSTEM_TYPES,s.type))}</span><span class="badge">${esc(v72Label(V72_FREQUENCIES,s.frequency))}</span></div><button onclick="v72OpenSystem('${s.id}')">ویرایش</button></div><div class="v72EntityMain">${v72Ring(adh,'پایبندی')}<div><h3>${esc(s.name||'سیستم بدون نام')}</h3><p>هدف: ${esc(v72GoalTitle(s.goalId))}</p><small>${fa((s.steps||[]).length)} مرحله · زمان استاندارد ${fa(s.standardMinutes||0)} دقیقه</small></div></div>${block?`<div class="v72Bottleneck">گلوگاه: مرحله «${esc(block.title)}» در ۳۰ روز اخیر ${fa(block.count)} بار عقب افتاده است.</div>`:''}<div class="v72MiniStats"><span>هدف پایبندی ${fa(s.targetAdherence||80)}٪</span><span>اجرای کامل ${fa(v72SystemRuns(s.id).filter(r=>r.status==='completed').length)}</span><span>${s.nextRunDate?'اجرای بعد '+fa(s.nextRunDate):'بدون زمان‌بندی'}</span></div><div class="v72CardActions"><button class="primary" onclick="v72StartSystem('${s.id}')" ${run?'disabled':''}>${run?'در حال اجرا':'شروع اجرا'}</button><button onclick="v72DuplicateSystem('${s.id}')">کپی سیستم</button></div></article>`;
}
function v72RunCard(r){
  const sys=v72System(r.systemId),cur=(r.steps||[]).find(s=>s.status==='active')||(r.steps||[]).find(s=>s.status==='pending');
  return `<article><div><b>${esc(sys?.name||'سیستم')}</b><small>مرحله جاری: ${esc(cur?.title||'در حال تکمیل')}</small></div><div><span>${fa(v72RunProgress(r))}٪</span>${cur?.taskId?`<button onclick="openDlg(S.tasks.find(t=>t.id==='${cur.taskId}'))">بازکردن کار</button>`:''}</div></article>`;
}

// ===== دیالوگ‌ها =====
function v72BuildDialogs(){
  if(document.getElementById('v72GoalDialog'))return;
  document.body.insertAdjacentHTML('beforeend',`
  <dialog id="v72GoalDialog"><form id="v72GoalForm"><div class="dlgHead"><div><h3 id="v72GoalDialogTitle">هدف جدید</h3><p class="muted">پیشرفت از ترکیب گام‌ها و KPIها محاسبه می‌شود.</p></div><button type="button" onclick="v72CloseDialog('v72GoalDialog')">×</button></div><input type="hidden" id="v72GoalId"><div class="formGrid"><label class="wide">عنوان هدف<input id="v72GoalTitle" required></label><label>حوزه زندگی<select id="v72GoalArea" required></select></label><label>وضعیت<select id="v72GoalStatus"></select></label><label>تاریخ شروع شمسی<input id="v72GoalStart" placeholder="1405-01-01"></label><label>مهلت شمسی<input id="v72GoalDue" placeholder="1405-12-29"></label><label>اهمیت از ۱ تا ۵<input id="v72GoalImportance" type="number" min="1" max="5" value="3"></label><label>پیشرفت دستیِ جایگزین<input id="v72GoalManual" type="number" min="0" max="100" value="0"></label><label class="wide">چرایی<textarea id="v72GoalWhy"></textarea></label><label class="wide">نتیجه مطلوب<textarea id="v72GoalResult"></textarea></label><label>وزن گام‌ها<input id="v72GoalStepWeight" type="number" min="0" max="100" value="40"></label><label>وزن KPIها<input id="v72GoalKpiWeight" type="number" min="0" max="100" value="60"></label></div><section class="v72BuilderBlock"><div class="v72BuilderHead"><h4>گام‌های هدف</h4><button type="button" onclick="v72AddGoalStep()">+ گام</button></div><div id="v72GoalSteps" class="v72BuilderRows"></div></section><section class="v72BuilderBlock"><div class="v72BuilderHead"><h4>KPIها</h4><button type="button" onclick="v72AddGoalKpi()">+ KPI</button></div><div id="v72GoalKpis" class="v72BuilderRows"></div></section><footer><button type="button" id="v72DeleteGoal" class="danger hide">حذف</button><span></span><button type="button" onclick="v72CloseDialog('v72GoalDialog')">انصراف</button><button class="primary">ذخیره هدف</button></footer></form></dialog>
  <dialog id="v72ProjectDialog"><form id="v72ProjectForm"><div class="dlgHead"><div><h3 id="v72ProjectDialogTitle">پروژه جدید</h3><p class="muted">پروژه باید به یک هدف متصل باشد.</p></div><button type="button" onclick="v72CloseDialog('v72ProjectDialog')">×</button></div><input type="hidden" id="v72ProjectId"><div class="formGrid"><label class="wide">قالب پروژه<select id="v72ProjectTemplate">${Object.entries(V72_PROJECT_TEMPLATES).map(([k,t])=>`<option value="${k}">${t.title}</option>`).join('')}</select></label><label class="wide">عنوان پروژه<input id="v72ProjectTitle" required></label><label>هدف مادر<select id="v72ProjectGoal" required></select></label><label>نوع پروژه<input id="v72ProjectType"></label><label>وضعیت<select id="v72ProjectStatus"></select></label><label>روش پیشرفت<select id="v72ProjectProgressMode"><option value="combo">ترکیب کارها و درصد دستی</option><option value="tasks">فقط کارهای متصل</option><option value="manual">فقط درصد دستی</option></select></label><label>پیشرفت دستی<input id="v72ProjectManual" type="number" min="0" max="100" value="0"></label><label>اهمیت از ۱ تا ۵<input id="v72ProjectImportance" type="number" min="1" max="5" value="3"></label><label>تاریخ شروع<input id="v72ProjectStart" placeholder="1405-01-01"></label><label>مهلت<input id="v72ProjectDue" placeholder="1405-12-29"></label><label>بودجه به تومان<input id="v72ProjectBudget" type="number" min="0"></label><label>افراد مرتبط<input id="v72ProjectPeople" placeholder="نام‌ها با ویرگول"></label><label class="wide">شرح<textarea id="v72ProjectDesc"></textarea></label><label class="wide">خروجی نهایی<textarea id="v72ProjectOutput"></textarea></label><label class="wide">معیار موفقیت<textarea id="v72ProjectSuccess"></textarea></label></div><section class="v72BuilderBlock"><h4>آورده‌های پروژه از صفر تا پنج</h4><div class="v72ContributionGrid"><label>مالی<input id="v72CFinancial" type="number" min="0" max="5" value="0"></label><label>اعتباری<input id="v72CCredibility" type="number" min="0" max="5" value="0"></label><label>علمی<input id="v72CScientific" type="number" min="0" max="5" value="0"></label><label>سازمانی<input id="v72COrganizational" type="number" min="0" max="5" value="0"></label><label>بین‌المللی<input id="v72CInternational" type="number" min="0" max="5" value="0"></label></div></section><footer><button type="button" id="v72DeleteProject" class="danger hide">حذف</button><span></span><button type="button" onclick="v72CloseDialog('v72ProjectDialog')">انصراف</button><button class="primary">ذخیره پروژه</button></footer></form></dialog>
  <dialog id="v72SystemDialog"><form id="v72SystemForm"><div class="dlgHead"><div><h3 id="v72SystemDialogTitle">ساخت سیستم</h3><p class="muted">مراحل سیستم را خودت تعریف کن؛ مرحله بعد پس از تکمیل، همان لحظه ساخته می‌شود.</p></div><button type="button" onclick="v72CloseDialog('v72SystemDialog')">×</button></div><input type="hidden" id="v72SystemId"><div class="formGrid"><label class="wide">نام سیستم<input id="v72SystemName" required></label><label>هدف مرتبط<select id="v72SystemGoal" required></select></label><label>پروژه مرتبط<select id="v72SystemProject"></select></label><label>نوع سیستم<select id="v72SystemType"></select></label><label>تناوب<select id="v72SystemFrequency"></select></label><label>تعداد هدف در هر دوره<input id="v72SystemFrequencyCount" type="number" min="1" max="30" value="1"></label><label>اولویت<select id="v72SystemPriority"><option>بالا</option><option selected>متوسط</option><option>پایین</option></select></label><label>زمان استاندارد کل، دقیقه<input id="v72SystemMinutes" type="number" min="0" value="30"></label><label>هدف پایبندی درصد<input id="v72SystemAdherence" type="number" min="0" max="100" value="80"></label><label>اجرای بعدی شمسی<input id="v72SystemNext" placeholder="1405-01-01"></label><label>عنوان KPI<input id="v72SystemKpiTitle"></label><label>مقدار فعلی KPI<input id="v72SystemKpiCurrent" type="number"></label><label>مقدار هدف KPI<input id="v72SystemKpiTarget" type="number"></label><label>واحد KPI<input id="v72SystemKpiUnit"></label><label class="wide">نتیجه مورد انتظار<textarea id="v72SystemResult"></textarea></label><label class="wide">توضیحات<textarea id="v72SystemDesc"></textarea></label><label class="v72InlineCheck"><input id="v72SystemActive" type="checkbox" checked> سیستم فعال باشد</label></div><section class="v72BuilderBlock"><div class="v72BuilderHead"><h4>مراحل سیستم</h4><button type="button" onclick="v72AddSystemStep()">+ مرحله</button></div><div id="v72SystemSteps" class="v72BuilderRows"></div></section><footer><button type="button" id="v72DeleteSystem" class="danger hide">حذف</button><span></span><button type="button" onclick="v72CloseDialog('v72SystemDialog')">انصراف</button><button class="primary">ذخیره سیستم</button></footer></form></dialog>
  <dialog id="v72AreasDialog"><form id="v72AreasForm"><div class="dlgHead"><div><h3>حوزه‌های زندگی</h3><p class="muted">مجموع وزن حوزه‌های فعال بهتر است ۱۰۰ باشد.</p></div><button type="button" onclick="v72CloseDialog('v72AreasDialog')">×</button></div><div id="v72AreaRows" class="v72BuilderRows"></div><div class="v72BuilderHead"><button type="button" onclick="v72AddAreaRow()">+ حوزه سفارشی</button><b id="v72AreaTotal"></b></div><footer><span></span><button type="button" onclick="v72CloseDialog('v72AreasDialog')">انصراف</button><button class="primary">ذخیره حوزه‌ها</button></footer></form></dialog>`);

  document.body.insertAdjacentHTML('beforeend',`<dialog id="v72ProjectTasksDialog"><form method="dialog"><div class="dlgHead"><div><h3 id="v72ProjectTasksTitle">کارهای پروژه</h3><p class="muted">فعالیت‌های متصل به این پروژه</p></div><button type="button" onclick="v72CloseDialog('v72ProjectTasksDialog')">×</button></div><section id="v72ProjectTasksBody"></section></form></dialog>`);

  document.getElementById('v72GoalForm').onsubmit=e=>{e.preventDefault();v72SaveGoal()};
  document.getElementById('v72ProjectForm').onsubmit=e=>{e.preventDefault();v72SaveProject()};
  document.getElementById('v72SystemForm').onsubmit=e=>{e.preventDefault();v72SaveSystem()};
  document.getElementById('v72AreasForm').onsubmit=e=>{e.preventDefault();v72SaveAreas()};
  document.getElementById('v72ProjectTemplate').onchange=e=>v72ApplyProjectTemplate(e.target.value);
  document.getElementById('v72SystemGoal').onchange=e=>{document.getElementById('v72SystemProject').innerHTML=v72ProjectOptions('',e.target.value)};
}
function v72CloseDialog(id){document.getElementById(id)?.close()}
window.v72CloseDialog=v72CloseDialog;

function v72GoalStepRow(s={}){return `<div class="v72BuilderRow v72GoalStepRow" data-id="${s.id||v72Uid('step')}"><input class="v72Grow" placeholder="عنوان گام" value="${esc(s.title||'')}"><label class="v72TinyCheck"><input type="checkbox" ${s.done?'checked':''}> انجام</label><button type="button" class="danger" onclick="this.closest('.v72BuilderRow').remove()">×</button></div>`}
function v72GoalKpiRow(k={}){return `<div class="v72BuilderRow v72GoalKpiRow" data-id="${k.id||v72Uid('kpi')}"><input class="v72Grow" data-f="title" placeholder="عنوان KPI" value="${esc(k.title||'')}"><input data-f="current" type="number" placeholder="فعلی" value="${v72Num(k.current)}"><input data-f="target" type="number" placeholder="هدف" value="${v72Num(k.target)}"><input data-f="unit" placeholder="واحد" value="${esc(k.unit||'')}"><input data-f="weight" type="number" min="0" placeholder="وزن" value="${v72Num(k.weight,1)}"><button type="button" class="danger" onclick="this.closest('.v72BuilderRow').remove()">×</button></div>`}
function v72AddGoalStep(data={}){document.getElementById('v72GoalSteps').insertAdjacentHTML('beforeend',v72GoalStepRow(data))}
function v72AddGoalKpi(data={}){document.getElementById('v72GoalKpis').insertAdjacentHTML('beforeend',v72GoalKpiRow(data))}
window.v72AddGoalStep=v72AddGoalStep;window.v72AddGoalKpi=v72AddGoalKpi;

function v72OpenGoal(goalId=''){
  const g=v72Goal(goalId)||{};v72BuildDialogs();
  document.getElementById('v72GoalDialogTitle').textContent=goalId?'ویرایش هدف':'هدف جدید';
  document.getElementById('v72GoalId').value=goalId;document.getElementById('v72GoalTitle').value=g.title||'';
  document.getElementById('v72GoalArea').innerHTML='<option value="">انتخاب حوزه...</option>'+v72AreaOptions(g.areaId);
  document.getElementById('v72GoalStatus').innerHTML=v72Options(V72_GOAL_STATUSES,g.status||'draft');
  document.getElementById('v72GoalStart').value=g.start||todayJ();document.getElementById('v72GoalDue').value=g.due||'';
  document.getElementById('v72GoalImportance').value=g.importance||3;document.getElementById('v72GoalManual').value=g.manualProgress||0;
  document.getElementById('v72GoalWhy').value=g.why||'';document.getElementById('v72GoalResult').value=g.result||'';
  document.getElementById('v72GoalStepWeight').value=g.stepWeight??40;document.getElementById('v72GoalKpiWeight').value=g.kpiWeight??60;
  document.getElementById('v72GoalSteps').innerHTML='';(g.steps||[]).forEach(v72AddGoalStep);
  document.getElementById('v72GoalKpis').innerHTML='';(g.kpis||[]).forEach(v72AddGoalKpi);
  const del=document.getElementById('v72DeleteGoal');del.classList.toggle('hide',!goalId);del.onclick=()=>v72DeleteGoal(goalId);
  document.getElementById('v72GoalDialog').showModal();
}
window.v72OpenGoal=v72OpenGoal;
function v72SaveGoal(){
  const gid=document.getElementById('v72GoalId').value,title=document.getElementById('v72GoalTitle').value.trim(),areaId=document.getElementById('v72GoalArea').value,status=document.getElementById('v72GoalStatus').value;
  if(!title||!areaId)return alert('عنوان و حوزه هدف را کامل کن.');
  if(['active','focus90'].includes(status)&&v72ActiveGoalCount(gid)>=V72_ACTIVE_GOAL_LIMIT)return alert('حداکثر ۷ هدف می‌تواند فعال باشد. ابتدا یکی از اهداف فعال را به وضعیت دیگری منتقل کن.');
  if(status==='focus90'&&v72FocusGoalCount(gid)>=V72_FOCUS_GOAL_LIMIT)return alert('حداکثر ۳ هدف تمرکز ۹۰روزه مجاز است.');
  const startRaw=document.getElementById('v72GoalStart').value.trim(),dueRaw=document.getElementById('v72GoalDue').value.trim();
  const start=startRaw?jDate(startRaw):'',due=dueRaw?jDate(dueRaw):'';
  if(startRaw&&!start)return alert('تاریخ شروع معتبر نیست.');if(dueRaw&&!due)return alert('مهلت معتبر نیست.');
  const steps=[...document.querySelectorAll('.v72GoalStepRow')].map(r=>({id:r.dataset.id,title:r.querySelector('input[type="text"],input:not([type])')?.value.trim()||r.querySelector('.v72Grow').value.trim(),done:r.querySelector('input[type="checkbox"]').checked})).filter(s=>s.title);
  const kpis=[...document.querySelectorAll('.v72GoalKpiRow')].map(r=>({id:r.dataset.id,title:r.querySelector('[data-f="title"]').value.trim(),current:v72Num(r.querySelector('[data-f="current"]').value),target:v72Num(r.querySelector('[data-f="target"]').value),unit:r.querySelector('[data-f="unit"]').value.trim(),weight:Math.max(.01,v72Num(r.querySelector('[data-f="weight"]').value,1))})).filter(k=>k.title);
  const old=v72Goal(gid),now=v72Now();
  const row={id:gid||v72Uid('goal'),title,areaId,status,start,due,importance:v72Clamp(document.getElementById('v72GoalImportance').value,1,5),manualProgress:v72Clamp(document.getElementById('v72GoalManual').value),why:document.getElementById('v72GoalWhy').value.trim(),result:document.getElementById('v72GoalResult').value.trim(),stepWeight:v72Clamp(document.getElementById('v72GoalStepWeight').value),kpiWeight:v72Clamp(document.getElementById('v72GoalKpiWeight').value),steps,kpis,createdAt:old?.createdAt||now,updatedAt:now};
  const i=S.goalsV7.findIndex(x=>x.id===row.id);i>=0?S.goalsV7[i]=row:S.goalsV7.unshift(row);save();v72CloseDialog('v72GoalDialog');render();
}
function v72DeleteGoal(id){
  if(S.projects.some(p=>p.goalId===id)||S.systems.some(s=>s.goalId===id))return alert('این هدف به پروژه یا سیستم متصل است. ابتدا وابستگی‌ها را تغییر بده.');
  if(!confirm('این هدف حذف شود؟'))return;v7MarkDeleted?.('goalsV7',id);S.goalsV7=S.goalsV7.filter(g=>g.id!==id);save();v72CloseDialog('v72GoalDialog');render();
}
window.v72DeleteGoal=v72DeleteGoal;

function v72ImportLegacyGoals(){
  const old=[];for(const [group,arr] of Object.entries(S.goals||{}))for(const g of arr||[])if(g.title&&!S.goalsV7.some(x=>x.legacyId===g.id))old.push({group,g});
  if(!old.length)return alert('هدف جدیدی برای انتقال پیدا نشد.');
  if(!confirm(`${fa(old.length)} هدف قبلی به وضعیت «در انتظار» منتقل شود؟ اطلاعات قبلی نیز حفظ می‌شود.`))return;
  const fallback=S.areas[0]?.id;
  for(const {group,g} of old)S.goalsV7.push({id:v72Uid('goal'),legacyId:g.id,title:g.title,areaId:fallback,status:'waiting',start:'',due:g.due||'',importance:3,manualProgress:goalProgress?.(g)||0,why:g.why||'',result:g.target||'',stepWeight:100,kpiWeight:0,steps:v72Clone(g.steps||[]),kpis:[],legacyGroup:group,createdAt:g.createdAt||v72Now(),updatedAt:v72Now()});
  save();render();alert('اهداف قبلی منتقل شدند. حوزه هر هدف را بعداً ویرایش کن.');
}
window.v72ImportLegacyGoals=v72ImportLegacyGoals;

// ===== پروژه CRUD =====
function v72ApplyProjectTemplate(key){
  const t=V72_PROJECT_TEMPLATES[key];if(!t||key==='blank')return;
  if(!document.getElementById('v72ProjectId').value){document.getElementById('v72ProjectTitle').value=t.title;document.getElementById('v72ProjectType').value=t.type;document.getElementById('v72ProjectOutput').value=t.output;document.getElementById('v72ProjectSuccess').value=t.success;document.getElementById('v72ProjectDesc').value=t.description;}
}
function v72OpenProject(projectId='',presetGoal=''){
  v72BuildDialogs();const p=v72Project(projectId)||{};
  document.getElementById('v72ProjectDialogTitle').textContent=projectId?'ویرایش پروژه':'پروژه جدید';document.getElementById('v72ProjectId').value=projectId;
  document.getElementById('v72ProjectTemplate').value='blank';document.getElementById('v72ProjectTitle').value=p.title||'';
  document.getElementById('v72ProjectGoal').innerHTML=v72GoalOptions(p.goalId||presetGoal,false);document.getElementById('v72ProjectType').value=p.type||'';
  document.getElementById('v72ProjectStatus').innerHTML=v72Options(V72_PROJECT_STATUSES,p.status||'planning');document.getElementById('v72ProjectProgressMode').value=p.progressMode||'combo';
  document.getElementById('v72ProjectManual').value=p.manualProgress||0;document.getElementById('v72ProjectImportance').value=p.importance||3;
  document.getElementById('v72ProjectStart').value=p.start||todayJ();document.getElementById('v72ProjectDue').value=p.due||'';document.getElementById('v72ProjectBudget').value=p.budget||'';
  document.getElementById('v72ProjectPeople').value=(p.people||[]).join('، ');document.getElementById('v72ProjectDesc').value=p.description||'';document.getElementById('v72ProjectOutput').value=p.output||'';document.getElementById('v72ProjectSuccess').value=p.successCriteria||'';
  const c=p.contributions||{};document.getElementById('v72CFinancial').value=c.financial||0;document.getElementById('v72CCredibility').value=c.credibility||0;document.getElementById('v72CScientific').value=c.scientific||0;document.getElementById('v72COrganizational').value=c.organizational||0;document.getElementById('v72CInternational').value=c.international||0;
  const del=document.getElementById('v72DeleteProject');del.classList.toggle('hide',!projectId);del.onclick=()=>v72DeleteProject(projectId);document.getElementById('v72ProjectDialog').showModal();
}
window.v72OpenProject=v72OpenProject;
function v72SaveProject(){
  const pid=document.getElementById('v72ProjectId').value,title=document.getElementById('v72ProjectTitle').value.trim(),goalId=document.getElementById('v72ProjectGoal').value;
  if(!title||!goalId)return alert('عنوان پروژه و هدف مادر الزامی است.');
  const sr=document.getElementById('v72ProjectStart').value.trim(),dr=document.getElementById('v72ProjectDue').value.trim(),start=sr?jDate(sr):'',due=dr?jDate(dr):'';
  if(sr&&!start)return alert('تاریخ شروع معتبر نیست.');if(dr&&!due)return alert('مهلت معتبر نیست.');
  const old=v72Project(pid),now=v72Now(),goal=v72Goal(goalId);
  const row={id:pid||v72Uid('project'),title,goalId,areaId:goal?.areaId||'',type:document.getElementById('v72ProjectType').value.trim()||'سفارشی',status:document.getElementById('v72ProjectStatus').value,progressMode:document.getElementById('v72ProjectProgressMode').value,manualProgress:v72Clamp(document.getElementById('v72ProjectManual').value),importance:v72Clamp(document.getElementById('v72ProjectImportance').value,1,5),start,due,budget:Math.max(0,v72Num(document.getElementById('v72ProjectBudget').value)),people:document.getElementById('v72ProjectPeople').value.split(/[،,]/).map(x=>x.trim()).filter(Boolean),description:document.getElementById('v72ProjectDesc').value.trim(),output:document.getElementById('v72ProjectOutput').value.trim(),successCriteria:document.getElementById('v72ProjectSuccess').value.trim(),contributions:{financial:v72Clamp(document.getElementById('v72CFinancial').value,0,5),credibility:v72Clamp(document.getElementById('v72CCredibility').value,0,5),scientific:v72Clamp(document.getElementById('v72CScientific').value,0,5),organizational:v72Clamp(document.getElementById('v72COrganizational').value,0,5),international:v72Clamp(document.getElementById('v72CInternational').value,0,5)},createdAt:old?.createdAt||now,updatedAt:now};
  const i=S.projects.findIndex(x=>x.id===row.id);i>=0?S.projects[i]=row:S.projects.unshift(row);save();v72CloseDialog('v72ProjectDialog');render();
}
function v72DeleteProject(id){
  if(S.systems.some(s=>s.projectId===id))return alert('این پروژه به یک سیستم متصل است. ابتدا اتصال سیستم را تغییر بده.');
  if(!confirm('پروژه حذف شود؟ کارهای متصل حذف نمی‌شوند و فقط اتصالشان باقی می‌ماند.'))return;v7MarkDeleted?.('projects',id);S.projects=S.projects.filter(p=>p.id!==id);save();v72CloseDialog('v72ProjectDialog');render();
}
window.v72DeleteProject=v72DeleteProject;
function v72OpenProjectTasks(projectId){
  const p=v72Project(projectId),box=document.getElementById('v72ProjectTasksBody');if(!p||!box)return;
  const tasks=v72LinkedTasks(projectId).sort(sortT);document.getElementById('v72ProjectTasksTitle').textContent='کارهای پروژه: '+p.title;
  box.innerHTML=`<div class="v72CardActions"><button type="button" class="primary" onclick="v72CloseDialog('v72ProjectTasksDialog');v72CreateTaskForProject('${projectId}')">+ کار مرتبط</button></div>${tasks.length?`<div class="tasks">${tasks.map(t=>`<article class="task ${done(t)?'done':''}"><div class="taskHead"><div><b>${esc(t.title)}</b><div class="badges"><span class="badge">${fa(t.jDate)}</span><span class="badge ${done(t)?'ok':late(t)?'late':''}">${esc(t.status)}</span></div></div><button type="button" onclick="v72CloseDialog('v72ProjectTasksDialog');openDlg(S.tasks.find(x=>x.id==='${t.id}'))">ویرایش</button></div></article>`).join('')}</div>`:'<div class="empty">هنوز کاری به این پروژه متصل نشده است.</div>'}`;
  document.getElementById('v72ProjectTasksDialog').showModal();
}
window.v72OpenProjectTasks=v72OpenProjectTasks;
function v72CreateTaskForProject(projectId){
  const p=v72Project(projectId);if(!p)return;openDlg(null,todayJ());
  document.getElementById('category').value=p.title;document.getElementById('taskGoalV72').value=p.goalId;v72RefreshTaskProjects(p.goalId,p.id);
}
window.v72CreateTaskForProject=v72CreateTaskForProject;

// ===== سیستم CRUD و اجرا =====
function v72SystemStepRow(s={}){return `<div class="v72BuilderRow v72SystemStepRow" data-id="${s.id||v72Uid('sysstep')}"><input class="v72Grow" data-f="title" placeholder="عنوان مرحله" value="${esc(s.title||'')}"><input data-f="minutes" type="number" min="0" placeholder="دقیقه" value="${v72Num(s.standardMinutes,15)}"><button type="button" onclick="v72MoveStep(this,-1)">↑</button><button type="button" onclick="v72MoveStep(this,1)">↓</button><button type="button" class="danger" onclick="this.closest('.v72BuilderRow').remove()">×</button></div>`}
function v72AddSystemStep(data={}){document.getElementById('v72SystemSteps').insertAdjacentHTML('beforeend',v72SystemStepRow(data))}
function v72MoveStep(btn,dir){const row=btn.closest('.v72BuilderRow'),sib=dir<0?row.previousElementSibling:row.nextElementSibling;if(sib)row.parentElement.insertBefore(dir<0?row:sib,dir<0?sib:row)}
window.v72AddSystemStep=v72AddSystemStep;window.v72MoveStep=v72MoveStep;
function v72OpenSystem(systemId='',presetGoal='',presetProject=''){
  v72BuildDialogs();const s=v72System(systemId)||{};
  document.getElementById('v72SystemDialogTitle').textContent=systemId?'ویرایش سیستم':'ساخت سیستم';document.getElementById('v72SystemId').value=systemId;document.getElementById('v72SystemName').value=s.name||'';
  document.getElementById('v72SystemGoal').innerHTML=v72GoalOptions(s.goalId||presetGoal,false);document.getElementById('v72SystemProject').innerHTML=v72ProjectOptions(s.projectId||presetProject,s.goalId||presetGoal);
  document.getElementById('v72SystemType').innerHTML=v72Options(V72_SYSTEM_TYPES,s.type||'routine');document.getElementById('v72SystemFrequency').innerHTML=v72Options(V72_FREQUENCIES,s.frequency||'manual');
  document.getElementById('v72SystemFrequencyCount').value=s.frequencyCount||1;document.getElementById('v72SystemPriority').value=s.priority||'متوسط';document.getElementById('v72SystemMinutes').value=s.standardMinutes||30;document.getElementById('v72SystemAdherence').value=s.targetAdherence||80;document.getElementById('v72SystemNext').value=s.nextRunDate||'';
  document.getElementById('v72SystemKpiTitle').value=s.kpi?.title||'';document.getElementById('v72SystemKpiCurrent').value=s.kpi?.current||'';document.getElementById('v72SystemKpiTarget').value=s.kpi?.target||'';document.getElementById('v72SystemKpiUnit').value=s.kpi?.unit||'';document.getElementById('v72SystemResult').value=s.expectedResult||'';document.getElementById('v72SystemDesc').value=s.description||'';document.getElementById('v72SystemActive').checked=s.active!==false;
  document.getElementById('v72SystemSteps').innerHTML='';(s.steps||[]).forEach(v72AddSystemStep);if(!(s.steps||[]).length)v72AddSystemStep();
  const del=document.getElementById('v72DeleteSystem');del.classList.toggle('hide',!systemId);del.onclick=()=>v72DeleteSystem(systemId);document.getElementById('v72SystemDialog').showModal();
}
window.v72OpenSystem=v72OpenSystem;
function v72SaveSystem(){
  const sid=document.getElementById('v72SystemId').value,name=document.getElementById('v72SystemName').value.trim(),goalId=document.getElementById('v72SystemGoal').value;
  if(!name||!goalId)return alert('نام سیستم و هدف مرتبط الزامی است.');
  const nr=document.getElementById('v72SystemNext').value.trim(),nextRunDate=nr?jDate(nr):'';if(nr&&!nextRunDate)return alert('تاریخ اجرای بعدی معتبر نیست.');
  const steps=[...document.querySelectorAll('.v72SystemStepRow')].map((r,i)=>({id:r.dataset.id,title:r.querySelector('[data-f="title"]').value.trim(),standardMinutes:Math.max(0,v72Num(r.querySelector('[data-f="minutes"]').value,15)),order:i+1})).filter(s=>s.title);
  if(!steps.length)return alert('حداقل یک مرحله برای سیستم تعریف کن.');
  const old=v72System(sid),now=v72Now(),projectId=document.getElementById('v72SystemProject').value,goal=v72Goal(goalId);
  const row={id:sid||v72Uid('system'),name,goalId,projectId,areaId:goal?.areaId||'',type:document.getElementById('v72SystemType').value,frequency:document.getElementById('v72SystemFrequency').value,frequencyCount:Math.max(1,v72Num(document.getElementById('v72SystemFrequencyCount').value,1)),priority:document.getElementById('v72SystemPriority').value,standardMinutes:Math.max(0,v72Num(document.getElementById('v72SystemMinutes').value)),targetAdherence:v72Clamp(document.getElementById('v72SystemAdherence').value),nextRunDate,expectedResult:document.getElementById('v72SystemResult').value.trim(),description:document.getElementById('v72SystemDesc').value.trim(),active:document.getElementById('v72SystemActive').checked,kpi:{title:document.getElementById('v72SystemKpiTitle').value.trim(),current:v72Num(document.getElementById('v72SystemKpiCurrent').value),target:v72Num(document.getElementById('v72SystemKpiTarget').value),unit:document.getElementById('v72SystemKpiUnit').value.trim()},steps,createdAt:old?.createdAt||now,updatedAt:now,lastRunAt:old?.lastRunAt||''};
  const i=S.systems.findIndex(x=>x.id===row.id);i>=0?S.systems[i]=row:S.systems.unshift(row);save();v72CloseDialog('v72SystemDialog');render();
}
function v72DeleteSystem(id){
  if(v72ActiveRun(id))return alert('ابتدا اجرای جاری سیستم را تکمیل یا لغو کن.');
  if(!confirm('این سیستم حذف شود؟ تاریخچه اجرا حفظ می‌شود.'))return;v7MarkDeleted?.('systems',id);S.systems=S.systems.filter(s=>s.id!==id);save();v72CloseDialog('v72SystemDialog');render();
}
function v72DuplicateSystem(id){const s=v72System(id);if(!s)return;const copy=v72Clone(s);copy.id=v72Uid('system');copy.name=(copy.name||'سیستم')+' - کپی';copy.createdAt=copy.updatedAt=v72Now();copy.lastRunAt='';S.systems.unshift(copy);save();render()}
window.v72DeleteSystem=v72DeleteSystem;window.v72DuplicateSystem=v72DuplicateSystem;
function v72StartSystem(systemId){
  const sys=v72System(systemId);if(!sys||!sys.steps.length)return;if(v72ActiveRun(systemId))return alert('این سیستم هم‌اکنون یک اجرای باز دارد.');
  const now=v72Now(),run={id:v72Uid('run'),systemId,goalId:sys.goalId,projectId:sys.projectId||'',status:'active',startedAt:now,createdAt:now,updatedAt:now,steps:sys.steps.map((s,i)=>({id:v72Uid('runstep'),definitionId:s.id,title:s.title,standardMinutes:s.standardMinutes,status:i===0?'active':'pending',taskId:'',completedAt:''}))};
  S.systemRuns.unshift(run);v72CreateSystemTask(sys,run,run.steps[0]);save();render();
}
window.v72StartSystem=v72StartSystem;
function v72CreateSystemTask(sys,run,step){
  const now=v72Now(),taskId=id();step.taskId=taskId;
  S.tasks.push({id:taskId,title:`${sys.name}: ${step.title}`,desc:`مرحله سیستم «${sys.name}»`,jDate:todayJ(),start:'',end:'',type:'سیستم',priority:sys.priority||'متوسط',status:'انجام‌نشده',category:'سیستم: '+sys.name,repeat:'none',reminder:'off',notes:'',progress:0,parent:null,goalId:sys.goalId||'',projectId:sys.projectId||'',systemId:sys.id,systemRunId:run.id,systemStepId:step.definitionId,createdAt:now,updatedAt:now});
}
function v72AdvanceSystemFromTask(task){
  if(!task?.systemRunId||!task.systemStepId||task.status!=='انجام‌شده')return false;
  const run=S.systemRuns.find(r=>r.id===task.systemRunId);if(!run||run.status!=='active')return false;
  const current=run.steps.find(s=>s.definitionId===task.systemStepId&&s.status!=='completed');if(!current)return false;
  current.status='completed';current.completedAt=v72Now();run.updatedAt=v72Now();
  const next=run.steps.find(s=>s.status==='pending');
  if(next){next.status='active';const sys=v72System(run.systemId);if(sys&&!next.taskId)v72CreateSystemTask(sys,run,next)}
  else{run.status='completed';run.completedAt=v72Now();const sys=v72System(run.systemId);if(sys){sys.lastRunAt=run.completedAt;sys.nextRunDate=v72NextRunDate(sys,todayJ());sys.updatedAt=v72Now();}}
  return true;
}

// ===== حوزه‌ها =====
function v72AreaRow(a={}){return `<div class="v72BuilderRow v72AreaRow" data-id="${a.id||v72Uid('area')}"><input class="v72Grow" data-f="title" value="${esc(a.title||'')}" placeholder="نام حوزه"><input data-f="weight" type="number" min="0" max="100" value="${v72Num(a.weight)}"><label class="v72TinyCheck"><input data-f="active" type="checkbox" ${a.active!==false?'checked':''}> فعال</label><button type="button" class="danger" onclick="this.closest('.v72BuilderRow').remove();v72UpdateAreaTotal()">×</button></div>`}
function v72OpenAreas(){v72BuildDialogs();const box=document.getElementById('v72AreaRows');box.innerHTML=S.areas.sort((a,b)=>(a.order||0)-(b.order||0)).map(v72AreaRow).join('');box.oninput=v72UpdateAreaTotal;v72UpdateAreaTotal();document.getElementById('v72AreasDialog').showModal()}
function v72AddAreaRow(){document.getElementById('v72AreaRows').insertAdjacentHTML('beforeend',v72AreaRow({title:'',weight:0,active:true}));v72UpdateAreaTotal()}
function v72UpdateAreaTotal(){const total=[...document.querySelectorAll('.v72AreaRow')].filter(r=>r.querySelector('[data-f="active"]').checked).reduce((s,r)=>s+v72Num(r.querySelector('[data-f="weight"]').value),0);const x=document.getElementById('v72AreaTotal');if(x)x.textContent='مجموع وزن فعال: '+fa(total)}
function v72SaveAreas(){
  let rows=[...document.querySelectorAll('.v72AreaRow')].map((r,i)=>({id:r.dataset.id,title:r.querySelector('[data-f="title"]').value.trim(),weight:Math.max(0,v72Num(r.querySelector('[data-f="weight"]').value)),active:r.querySelector('[data-f="active"]').checked,order:i+1,createdAt:v72Area(r.dataset.id)?.createdAt||v72Now(),updatedAt:v72Now()})).filter(a=>a.title);
  const used=new Set([...S.goalsV7.map(g=>g.areaId),...S.projects.map(p=>p.areaId),...S.systems.map(s=>s.areaId)].filter(Boolean));
  const removedUsed=S.areas.filter(a=>used.has(a.id)&&!rows.some(r=>r.id===a.id));if(removedUsed.length)return alert('حوزه‌ای که به هدف، پروژه یا سیستم متصل است قابل حذف نیست؛ می‌توانی آن را غیرفعال کنی.');
  const active=rows.filter(a=>a.active),total=active.reduce((s,a)=>s+a.weight,0);
  if(active.length&&total<=0)return alert('وزن حوزه‌های فعال نمی‌تواند صفر باشد.');
  if(active.length&&Math.abs(total-100)>.001){if(!confirm(`مجموع وزن‌ها ${fa(total)} است. وزن حوزه‌های فعال به‌صورت خودکار به ۱۰۰ نرمال شود؟`))return;for(const a of active)a.weight=Math.round(a.weight/total*1000)/10;const diff=100-active.reduce((s,a)=>s+a.weight,0);if(active[0])active[0].weight=Math.round((active[0].weight+diff)*10)/10;}
  S.areas=rows;save();v72CloseDialog('v72AreasDialog');render();
}
window.v72OpenAreas=v72OpenAreas;window.v72AddAreaRow=v72AddAreaRow;window.v72UpdateAreaTotal=v72UpdateAreaTotal;

// ===== اتصال کارها به هدف، پروژه و سیستم =====
function v72InstallTaskLinks(){
  if(document.getElementById('taskGoalV72'))return;
  const grid=document.querySelector('#taskForm .formGrid'),cat=document.getElementById('category')?.closest('label');if(!grid||!cat)return;
  const goal=document.createElement('label');goal.innerHTML='هدف مرتبط<select id="taskGoalV72"></select>';
  const project=document.createElement('label');project.innerHTML='پروژه مرتبط<select id="taskProjectV72"></select>';
  const system=document.createElement('label');system.innerHTML='سیستم مرتبط<select id="taskSystemV72"></select>';
  cat.insertAdjacentElement('afterend',goal);goal.insertAdjacentElement('afterend',project);project.insertAdjacentElement('afterend',system);
  goal.querySelector('select').onchange=e=>v72RefreshTaskProjects(e.target.value,'');
}
function v72RefreshTaskProjects(goalId,current=''){const el=document.getElementById('taskProjectV72');if(el)el.innerHTML=v72ProjectOptions(current,goalId)}
function v72PopulateTaskLinks(task={}){
  v72InstallTaskLinks();const g=document.getElementById('taskGoalV72'),p=document.getElementById('taskProjectV72'),s=document.getElementById('taskSystemV72');
  if(g)g.innerHTML=v72GoalOptions(task.goalId||'',true);v72RefreshTaskProjects(task.goalId||'',task.projectId||'');if(s)s.innerHTML=v72SystemOptions(task.systemId||'',true);
}
const v72OpenDlgBase=openDlg;
openDlg=function(t=null,d=sel){v72OpenDlgBase(t,d);v72PopulateTaskLinks(t||{})};window.openDlg=openDlg;
const v72SaveTaskBase=saveTask;
saveTask=function(){
  const before=new Set(S.tasks.map(t=>t.id)),editId=edit,old=editId?v72Clone(S.tasks.find(t=>t.id===editId)):null;
  const links={goalId:document.getElementById('taskGoalV72')?.value||'',projectId:document.getElementById('taskProjectV72')?.value||'',systemId:document.getElementById('taskSystemV72')?.value||''};
  v72SaveTaskBase();
  const task=editId?S.tasks.find(t=>t.id===editId):S.tasks.find(t=>!before.has(t.id));if(!task)return;
  if(links.projectId&&!links.goalId)links.goalId=v72Project(links.projectId)?.goalId||'';
  Object.assign(task,links,{systemRunId:old?.systemRunId||task.systemRunId||'',systemStepId:old?.systemStepId||task.systemStepId||'',updatedAt:v72Now()});
  const advanced=v72AdvanceSystemFromTask(task);save();if(advanced)render();
};window.saveTask=saveTask;
const v72PatchBase=patch;
patch=function(tid,obj){v72PatchBase(tid,obj);const task=S.tasks.find(t=>t.id===tid);if(task&&v72AdvanceSystemFromTask(task)){save();render()}};window.patch=patch;

// ===== راه‌اندازی =====
function v72Init(){
  v72EnsureState();
  if(!C.types.includes('سیستم'))C.types.push('سیستم');
  if(typeof fill==='function')fill('#type',C.types.map(x=>[x,x]));
  v72BuildDialogs();v72InstallTaskLinks();
  document.querySelectorAll('#v72AreasDialog input').forEach(x=>x.addEventListener('input',v72UpdateAreaTotal));
  const oldTitle=document.querySelector('title');if(oldTitle)oldTitle.textContent='Planner Life OS 7.3';
  const label=document.getElementById('calendarLabel');if(label)label.textContent='Planner Life OS 7.3 · تقویم شمسی چندساله';
  localStorage.setItem(K,JSON.stringify(S));buildNav();render();
}

v72Init();
