'use strict';

// ===== Planner Life OS 7.5 =====
// داشبورد مرکز فرماندهی، چرخ زندگی، امتیاز LEVEL UP، مرورهای روزانه/هفتگی و گزارش‌ها.
const V73_SCHEMA='planner-life-os-v7.5';
const V73_DEFAULT_LAYOUT=['alerts','focus','systems','wheel','heat','today','trends'];

function v73Now(){return new Date().toISOString()}
function v73Num(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f}
function v73Clamp(v,a=0,b=100){return Math.max(a,Math.min(b,v73Num(v)))}
function v73Avg(arr){const a=(arr||[]).filter(x=>Number.isFinite(+x));return a.length?Math.round(a.reduce((s,x)=>s+(+x),0)/a.length):0}
function v73Today(){return todayJ()}
function v73DayRange(start,count){return Array.from({length:count},(_,i)=>addDays(start,i))}
function v73DateLabel(d){try{return showDate(d)}catch(_){return fa(d)}}
function v73TaskWeight(t){return t.priority==='بالا'?3:t.priority==='متوسط'?2:1}
function v73TaskCompletion(ts){
  const rows=(ts||[]).filter(t=>!canc(t));
  if(!rows.length)return 0;
  const total=rows.reduce((s,t)=>s+v73TaskWeight(t),0);
  const doneWeight=rows.reduce((s,t)=>s+(done(t)?v73TaskWeight(t):v73TaskWeight(t)*v73Clamp(t.progress||0)/100),0);
  return Math.round(doneWeight/total*100);
}

function v73EnsureState(){
  S.dailyReviews=S.dailyReviews||{};
  S.weeklyReviews=S.weeklyReviews||{};
  S.levelUpHistory=S.levelUpHistory||{};
  S.dashboardLayout=Array.isArray(S.dashboardLayout)&&S.dashboardLayout.length?S.dashboardLayout:[...V73_DEFAULT_LAYOUT];
  S.settingsV7=S.settingsV7||{};
  S.settingsV7.dashboardLayoutVersion=1;
  S.meta=S.meta||{};
  S.meta.schemaVersion=V73_SCHEMA;
  (S.areas||[]).forEach(a=>{a.kpis=Array.isArray(a.kpis)?a.kpis:[];a.updatedAt=a.updatedAt||a.createdAt||v73Now()});
  localStorage.setItem(K,JSON.stringify(S));
  window.S=S;
}

function v73AreaKpiScore(area){
  const rows=(area?.kpis||[]).filter(k=>String(k.title||'').trim()&&v73Num(k.target)>0);
  if(!rows.length)return null;
  let sum=0,w=0;
  rows.forEach(k=>{const kw=Math.max(.01,v73Num(k.weight,1));sum+=v73Clamp(v73Num(k.current)/v73Num(k.target)*100)*kw;w+=kw});
  return Math.round(sum/w);
}
function v73AreaGoalScore(areaId){
  const rows=(S.goalsV7||[]).filter(g=>g.areaId===areaId&&!['archived','someday'].includes(g.status));
  return rows.length?v73Avg(rows.map(v72GoalProgress)):null;
}
function v73AreaSystemScore(areaId){
  const rows=(S.systems||[]).filter(s=>s.areaId===areaId&&s.active!==false);
  return rows.length?v73Avg(rows.map(v72SystemAdherence)):null;
}
function v73AreaProjectScore(areaId){
  const rows=(S.projects||[]).filter(p=>p.areaId===areaId&&!['completed','cancelled'].includes(p.status));
  return rows.length?v73Avg(rows.map(v72ProjectProgress)):null;
}
function v73WeightedScore(parts){
  const valid=parts.filter(p=>p.value!=null&&Number.isFinite(+p.value));
  if(!valid.length)return 0;
  const w=valid.reduce((s,p)=>s+p.weight,0)||1;
  return Math.round(valid.reduce((s,p)=>s+(+p.value)*p.weight,0)/w);
}
function v73AreaScore(area){
  const k=v73AreaKpiScore(area),g=v73AreaGoalScore(area.id),s=v73AreaSystemScore(area.id),p=v73AreaProjectScore(area.id);
  return k!=null
    ?v73WeightedScore([{value:k,weight:60},{value:g,weight:25},{value:s,weight:15}])
    :v73WeightedScore([{value:g,weight:60},{value:s,weight:25},{value:p,weight:15}]);
}
function v73LevelUpScore(){
  const areas=(S.areas||[]).filter(a=>a.active!==false);
  if(!areas.length)return 0;
  const total=areas.reduce((s,a)=>s+Math.max(0,v73Num(a.weight)),0)||1;
  return Math.round(areas.reduce((s,a)=>s+v73AreaScore(a)*Math.max(0,v73Num(a.weight)),0)/total);
}
function v73CaptureScore(){
  const d=v73Today(),score=v73LevelUpScore();
  const old=S.levelUpHistory[d];
  if(old?.score===score)return;
  S.levelUpHistory[d]={score,updatedAt:v73Now()};
  if(typeof v7TouchMap==='function')v7TouchMap('levelUpHistory',d);
  localStorage.setItem(K,JSON.stringify(S));
}
function v73Health(score){return score>=80?'green':score>=50?'yellow':'red'}
function v73StatusText(score){return score>=80?'در مسیر رشد':score>=50?'نیازمند توجه':'نیازمند مداخله'}
function v73Ring(score,label){return `<div class="v73Ring" style="--p:${v73Clamp(score)}"><div><b>${fa(score)}٪</b><small>${esc(label||'')}</small></div></div>`}

function v73Alerts(){
  const out=[];
  (S.tasks||[]).filter(t=>late(t)&&t.priority==='بالا').slice(0,6).forEach(t=>out.push({level:'red',title:'کار مهم عقب‌افتاده',detail:t.title,view:'tasks'}));
  (S.goalsV7||[]).filter(g=>['active','focus90'].includes(g.status)&&v72GoalHealth(g)==='red').forEach(g=>out.push({level:'red',title:'هدف خارج از مسیر',detail:g.title,view:'goalsV7'}));
  (S.projects||[]).filter(p=>p.due&&p.due<v73Today()&&!['completed','cancelled'].includes(p.status)).forEach(p=>out.push({level:'red',title:'پروژه گذشته از مهلت',detail:p.title,view:'projectsV7'}));
  (S.systems||[]).filter(s=>s.active!==false).forEach(s=>{const b=v72SystemBottleneck(s);if(b)out.push({level:'red',title:'گلوگاه سیستم',detail:`${s.name}: ${b.title}`,view:'systemsV7'})});
  (S.systems||[]).filter(s=>s.active!==false&&s.nextRunDate&&s.nextRunDate<=v73Today()&&!v72ActiveRun(s.id)).forEach(s=>out.push({level:'yellow',title:'سیستم موعد اجرا دارد',detail:s.name,view:'systemsV7'}));
  (S.goalsV7||[]).filter(g=>['active','focus90'].includes(g.status)&&g.due&&v72DateDiff(v73Today(),g.due)>=0&&v72DateDiff(v73Today(),g.due)<=14&&v72GoalProgress(g)<80).forEach(g=>out.push({level:'yellow',title:'هدف نزدیک به مهلت',detail:g.title,view:'goalsV7'}));
  if(!(S.goalsV7||[]).some(g=>g.status==='focus90'))out.push({level:'yellow',title:'تمرکز ۹۰روزه تعیین نشده',detail:'حداکثر سه هدف اصلی را انتخاب کن.',view:'goalsV7'});
  const rank={red:0,yellow:1,green:2};
  return out.sort((a,b)=>rank[a.level]-rank[b.level]).slice(0,12);
}
function v73Go(viewName){view=viewName;const n=C.nav.find(x=>x[0]===viewName);if(n)document.getElementById('pageTitle').textContent=n[3];buildNav();render()}
window.v73Go=v73Go;

function v73DashboardBlock(id,title,body,cls='c6'){
  return `<section class="card ${cls} v73DashBlock" data-card="${id}" draggable="true"><div class="v73BlockHead"><div><span class="v73Drag">⋮⋮</span><h3>${title}</h3></div><small>برای جابه‌جایی بکش</small></div>${body}</section>`;
}
function v73SortBlocks(blocks){
  const order=S.dashboardLayout||V73_DEFAULT_LAYOUT;
  return [...blocks].sort((a,b)=>{const ai=order.indexOf(a.id),bi=order.indexOf(b.id);return (ai<0?999:ai)-(bi<0?999:bi)});
}
function v73BindDashboardDnD(){
  const grid=document.getElementById('v73DashboardGrid');if(!grid)return;
  let dragging='';
  grid.querySelectorAll('.v73DashBlock').forEach(el=>{
    el.addEventListener('dragstart',()=>{dragging=el.dataset.card;el.classList.add('dragging')});
    el.addEventListener('dragend',()=>{el.classList.remove('dragging');dragging=''});
    el.addEventListener('dragover',e=>e.preventDefault());
    el.addEventListener('drop',e=>{
      e.preventDefault();const target=el.dataset.card;if(!dragging||dragging===target)return;
      const arr=[...grid.querySelectorAll('.v73DashBlock')].map(x=>x.dataset.card);
      const from=arr.indexOf(dragging),to=arr.indexOf(target);arr.splice(to,0,arr.splice(from,1)[0]);
      S.dashboardLayout=arr;save();v73Dashboard();
    });
  });
}

function v73DrawWheel(canvas){
  if(!canvas)return;
  const areas=(S.areas||[]).filter(a=>a.active!==false).sort((a,b)=>(a.order||0)-(b.order||0));
  const b=canvas.getBoundingClientRect(),r=devicePixelRatio||1,w=Math.max(320,b.width),h=Math.max(280,b.height||320);
  canvas.width=w*r;canvas.height=h*r;const x=canvas.getContext('2d');x.setTransform(r,0,0,r,0,0);x.clearRect(0,0,w,h);
  if(!areas.length){nodata(x,w,h);return}
  const cx=w/2,cy=h/2+4,R=Math.min(w,h)*.31,n=areas.length;
  x.font='12px Vazirmatn, Tahoma';x.textAlign='center';x.textBaseline='middle';
  for(let ring=1;ring<=5;ring++){
    x.beginPath();areas.forEach((a,i)=>{const ang=-Math.PI/2+i*2*Math.PI/n,rr=R*ring/5,px=cx+Math.cos(ang)*rr,py=cy+Math.sin(ang)*rr;i?x.lineTo(px,py):x.moveTo(px,py)});x.closePath();x.strokeStyle='#dce8dc';x.stroke();
  }
  areas.forEach((a,i)=>{const ang=-Math.PI/2+i*2*Math.PI/n;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(ang)*R,cy+Math.sin(ang)*R);x.strokeStyle='#e6efe5';x.stroke();const lr=R+38;x.fillStyle='#445648';const words=a.title.split(' ');const label=words.length>3?words.slice(0,3).join(' ')+'…':a.title;x.fillText(label,cx+Math.cos(ang)*lr,cy+Math.sin(ang)*lr)});
  x.beginPath();areas.forEach((a,i)=>{const ang=-Math.PI/2+i*2*Math.PI/n,rr=R*v73AreaScore(a)/100,px=cx+Math.cos(ang)*rr,py=cy+Math.sin(ang)*rr;i?x.lineTo(px,py):x.moveTo(px,py)});x.closePath();x.fillStyle='rgba(47,122,67,.20)';x.fill();x.strokeStyle='#2f7a43';x.lineWidth=3;x.stroke();
  areas.forEach((a,i)=>{const ang=-Math.PI/2+i*2*Math.PI/n,rr=R*v73AreaScore(a)/100,px=cx+Math.cos(ang)*rr,py=cy+Math.sin(ang)*rr;x.beginPath();x.arc(px,py,4,0,Math.PI*2);x.fillStyle='#2f7a43';x.fill()});
}

function v73Heatmap(days=90){
  const ds=v73DayRange(addDays(v73Today(),-(days-1)),days);
  return `<div class="v73Heat">${ds.map(d=>{const c=v73TaskCompletion(dayTasks(d)),lv=c>=90?4:c>=65?3:c>=35?2:c>0?1:0;return `<span class="h${lv}" title="${d}: ${c}%"></span>`}).join('')}</div><div class="v73HeatLegend"><span>کم</span><i class="h0"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i><i class="h4"></i><span>زیاد</span></div>`;
}
function v73AlertsHtml(alerts){
  if(!alerts.length)return '<div class="empty">هشدار مهمی وجود ندارد؛ وضعیت فعلی پایدار است.</div>';
  return `<div class="v73AlertList">${alerts.map(a=>`<button class="v73Alert ${a.level}" onclick="v73Go('${a.view}')"><span>${a.level==='red'?'●':'◆'}</span><div><b>${esc(a.title)}</b><small>${esc(a.detail)}</small></div><em>مشاهده</em></button>`).join('')}</div>`;
}
function v73SystemsHtml(){
  const rows=(S.systems||[]).filter(s=>s.active!==false).sort((a,b)=>{const ab=!!v72SystemBottleneck(a),bb=!!v72SystemBottleneck(b);return bb-ab||v72SystemAdherence(a)-v72SystemAdherence(b)}).slice(0,6);
  if(!rows.length)return '<div class="empty">هنوز سیستم فعالی تعریف نشده است.</div>';
  return `<div class="v73CompactList">${rows.map(s=>{const ad=v72SystemAdherence(s),b=v72SystemBottleneck(s);return `<button onclick="v73Go('systemsV7')"><div><b>${esc(s.name)}</b><small>${b?'گلوگاه: '+esc(b.title):'اجرای بعدی: '+fa(s.nextRunDate||'تعیین نشده')}</small></div><span class="${b?'v73Danger':''}">${fa(ad)}٪</span></button>`}).join('')}</div>`;
}
function v73FocusHtml(){
  const rows=(S.goalsV7||[]).filter(g=>g.status==='focus90').slice(0,3);
  if(!rows.length)return '<div class="empty">هدف تمرکز ۹۰روزه تعیین نشده است.</div>';
  return `<div class="v73FocusCards">${rows.map(g=>`<button onclick="v73Go('goalsV7')">${v73Ring(v72GoalProgress(g),g.title)}<div><b>${esc(g.title)}</b><small>${esc(v72AreaTitle(g.areaId))}</small></div></button>`).join('')}</div>`;
}
function v73TodayHtml(){
  const rows=dayTasks(v73Today());
  return rows.length?`<div class="v73TodayTasks">${rows.slice(0,8).map(t=>`<button onclick="openDlg(S.tasks.find(x=>x.id==='${t.id}'))"><span class="v73TaskDot ${done(t)?'done':late(t)?'late':''}"></span><div><b>${esc(t.title)}</b><small>${esc(t.start||'بدون ساعت')} · ${esc(t.priority)}</small></div><em>${fa(t.progress||0)}٪</em></button>`).join('')}</div>`:'<div class="empty">برای امروز فعالیتی ثبت نشده است.</div>';
}

function v73Dashboard(){
  v73EnsureState();v73CaptureScore();
  const score=v73LevelUpScore(),today=v73TaskCompletion(dayTasks(v73Today()));
  const focus=(S.goalsV7||[]).filter(g=>g.status==='focus90').slice(0,3),focusAvg=focus.length?v73Avg(focus.map(v72GoalProgress)):0;
  const systems=(S.systems||[]).filter(s=>s.active!==false),sysAvg=systems.length?v73Avg(systems.map(v72SystemAdherence)):0;
  const alerts=v73Alerts(),critical=alerts.filter(a=>a.level==='red').length;
  const blocks=[
    {id:'alerts',html:v73DashboardBlock('alerts','مرکز هشدار',v73AlertsHtml(alerts),'c12')},
    {id:'focus',html:v73DashboardBlock('focus','سه هدف تمرکز ۹۰روزه',v73FocusHtml(),'c6')},
    {id:'systems',html:v73DashboardBlock('systems','وضعیت سیستم‌ها',v73SystemsHtml(),'c6')},
    {id:'wheel',html:v73DashboardBlock('wheel','چرخ زندگی و تعادل حوزه‌ها','<canvas id="v73WheelCanvas" class="v73WheelCanvas"></canvas><button class="v73LinkBtn" onclick="v73Go(\'wheelV7\')">مشاهده جزئیات و شاخص‌ها</button>','c7')},
    {id:'heat',html:v73DashboardBlock('heat','نقشه حرارتی ۹۰ روز اخیر',v73Heatmap(90),'c5')},
    {id:'today',html:v73DashboardBlock('today','فعالیت‌های امروز',v73TodayHtml(),'c7')},
    {id:'trends',html:v73DashboardBlock('trends','روند عملکرد و اولویت‌ها','<div class="v73TwoCharts"><canvas id="v73Trend" class="chart"></canvas><canvas id="v73Priority" class="chart"></canvas></div>','c5')}
  ];
  const sorted=v73SortBlocks(blocks);
  document.getElementById('app').innerHTML=`
    <section class="v73Hero card"><div><small>مرکز فرماندهی زندگی</small><h3>${v73StatusText(score)}</h3><p>امروز مهم‌ترین انحراف‌ها و اقدامات لازم را در یک نگاه ببین.</p></div><div class="v73HeroActions"><button onclick="v73OpenDailyReview('${v73Today()}')">مرور امروز</button><button onclick="v73OpenWeeklyReview('${week(v73Today()).start}')">مرور هفته</button><button onclick="openDlg(null,'${v73Today()}')" class="primary">+ فعالیت</button></div></section>
    <section class="v73KpiGrid">
      <article>${v73Ring(score,'LEVEL UP')}<div><span>امتیاز LEVEL UP</span><b>${fa(score)} از ۱۰۰</b><small>${v73StatusText(score)}</small></div></article>
      <article>${v73Ring(today,'امروز')}<div><span>تحقق امروز</span><b>${fa(today)}٪</b><small>${fa(dayTasks(v73Today()).filter(done).length)} کار تکمیل‌شده</small></div></article>
      <article>${v73Ring(focusAvg,'۹۰ روزه')}<div><span>اهداف تمرکز</span><b>${fa(focusAvg)}٪</b><small>${fa(focus.length)} از ۳ هدف</small></div></article>
      <article>${v73Ring(sysAvg,'سیستم‌ها')}<div><span>پایبندی سیستم‌ها</span><b>${fa(sysAvg)}٪</b><small>${fa(systems.length)} سیستم فعال</small></div></article>
      <article class="${critical?'danger':''}">${v73Ring(Math.max(0,100-Math.min(100,critical*20)),'ریسک')}<div><span>هشدارهای بحرانی</span><b>${fa(critical)}</b><small>${critical?'نیازمند تصمیم امروز':'وضعیت پایدار'}</small></div></article>
    </section>
    <section id="v73DashboardGrid" class="grid dash v73DashboardGrid">${sorted.map(x=>x.html).join('')}</section>`;
  requestAnimationFrame(()=>{
    const wheel=document.getElementById('v73WheelCanvas'),trend=document.getElementById('v73Trend'),priority=document.getElementById('v73Priority');
    if(wheel)v73DrawWheel(wheel);
    if(trend)line(trend,Array.from({length:14},(_,i)=>{const d=addDays(v73Today(),i-13);return{label:fa(par(d).jd),value:v73TaskCompletion(dayTasks(d))}}));
    if(priority)dough(priority,group(inRange(addDays(v73Today(),-30),v73Today()),'priority'));
    v73BindDashboardDnD();
  });
}

// ===== چرخ زندگی =====
function v73WheelView(){
  const areas=(S.areas||[]).filter(a=>a.active!==false).sort((a,b)=>(a.order||0)-(b.order||0)),score=v73LevelUpScore();
  document.getElementById('app').innerHTML=`
    <section class="card v73WheelHero"><div>${v73Ring(score,'LEVEL UP')}</div><div><h3>چرخ زندگی شخصی</h3><p class="muted">امتیاز هر حوزه از KPIهای تعریف‌شده و عملکرد اهداف، پروژه‌ها و سیستم‌های همان حوزه محاسبه می‌شود.</p><div class="v73WheelActions"><button onclick="v72OpenAreas()">وزن حوزه‌ها</button><button onclick="v73OpenAreaKpis('${areas[0]?.id||''}')" class="primary">مدیریت شاخص‌ها</button></div></div></section>
    <section class="card"><canvas id="v73WheelPageCanvas" class="v73WheelCanvas large"></canvas></section>
    <section class="v73AreaGrid">${areas.map(a=>v73AreaCard(a)).join('')||'<div class="card empty">حوزه فعالی وجود ندارد.</div>'}</section>`;
  requestAnimationFrame(()=>v73DrawWheel(document.getElementById('v73WheelPageCanvas')));
}
function v73AreaCard(a){
  const score=v73AreaScore(a),k=v73AreaKpiScore(a),g=v73AreaGoalScore(a.id),s=v73AreaSystemScore(a.id),p=v73AreaProjectScore(a.id);
  return `<article class="card v73AreaCard ${v73Health(score)}"><div class="v73AreaTop">${v73Ring(score,a.title)}<div><h3>${esc(a.title)}</h3><small>وزن در LEVEL UP: ${fa(a.weight)}٪</small></div></div><div class="v73Breakdown"><span>KPI <b>${k==null?'—':fa(k)+'٪'}</b></span><span>اهداف <b>${g==null?'—':fa(g)+'٪'}</b></span><span>سیستم‌ها <b>${s==null?'—':fa(s)+'٪'}</b></span><span>پروژه‌ها <b>${p==null?'—':fa(p)+'٪'}</b></span></div><div class="bar"><i style="width:${score}%"></i></div><button onclick="v73OpenAreaKpis('${a.id}')">تعریف و ویرایش شاخص‌ها</button></article>`;
}
function v73BuildAreaDialog(){
  if(document.getElementById('v73AreaKpiDialog'))return;
  document.body.insertAdjacentHTML('beforeend',`<dialog id="v73AreaKpiDialog"><form id="v73AreaKpiForm"><div class="dlgHead"><div><h3 id="v73AreaKpiTitle">شاخص‌های حوزه</h3><p class="muted">شاخص‌ها باید مقدار فعلی، مقدار هدف و وزن داشته باشند.</p></div><button type="button" onclick="v73CloseAreaKpis()">×</button></div><input type="hidden" id="v73AreaKpiId"><div id="v73AreaKpiRows" class="v73KpiRows"></div><button type="button" onclick="v73AddAreaKpi()">+ شاخص جدید</button><footer><span></span><button type="button" onclick="v73CloseAreaKpis()">انصراف</button><button class="primary">ذخیره شاخص‌ها</button></footer></form></dialog>`);
  document.getElementById('v73AreaKpiForm').onsubmit=e=>{e.preventDefault();v73SaveAreaKpis()};
}
function v73KpiRow(k={}){return `<div class="v73KpiRow" data-id="${k.id||v72Uid('areakpi')}"><input data-f="title" placeholder="عنوان شاخص" value="${esc(k.title||'')}"><input data-f="current" type="number" step="any" placeholder="مقدار فعلی" value="${v73Num(k.current)}"><input data-f="target" type="number" step="any" placeholder="هدف" value="${v73Num(k.target)}"><input data-f="unit" placeholder="واحد" value="${esc(k.unit||'')}"><input data-f="weight" type="number" min="0" step="any" placeholder="وزن" value="${v73Num(k.weight,1)}"><button type="button" class="danger" onclick="this.closest('.v73KpiRow').remove()">×</button></div>`}
function v73OpenAreaKpis(areaId){
  const a=v72Area(areaId);if(!a)return;v73BuildAreaDialog();
  document.getElementById('v73AreaKpiId').value=a.id;document.getElementById('v73AreaKpiTitle').textContent='شاخص‌های '+a.title;
  document.getElementById('v73AreaKpiRows').innerHTML=(a.kpis||[]).map(v73KpiRow).join('')||v73KpiRow();
  document.getElementById('v73AreaKpiDialog').showModal();
}
function v73AddAreaKpi(){document.getElementById('v73AreaKpiRows').insertAdjacentHTML('beforeend',v73KpiRow())}
function v73CloseAreaKpis(){document.getElementById('v73AreaKpiDialog')?.close()}
function v73SaveAreaKpis(){
  const a=v72Area(document.getElementById('v73AreaKpiId').value);if(!a)return;
  a.kpis=[...document.querySelectorAll('#v73AreaKpiRows .v73KpiRow')].map(r=>({id:r.dataset.id,title:r.querySelector('[data-f="title"]').value.trim(),current:v73Num(r.querySelector('[data-f="current"]').value),target:v73Num(r.querySelector('[data-f="target"]').value),unit:r.querySelector('[data-f="unit"]').value.trim(),weight:Math.max(.01,v73Num(r.querySelector('[data-f="weight"]').value,1)),updatedAt:v73Now()})).filter(k=>k.title);
  a.updatedAt=v73Now();save();v73CloseAreaKpis();render();
}
window.v73OpenAreaKpis=v73OpenAreaKpis;window.v73AddAreaKpi=v73AddAreaKpi;window.v73CloseAreaKpis=v73CloseAreaKpis;

// ===== مرور روزانه =====
function v73DailySummary(d){
  const ts=dayTasks(d),m=met(ts),r=S.dailyReviews[d]||{};
  return {date:d,total:m.tot,done:m.d,late:m.l,completion:v73TaskCompletion(ts),energy:v73Num(r.energy),mood:v73Num(r.mood),reviewed:!!r.updatedAt};
}
function v73SuggestedTasks(d){
  const next=addDays(d,1),focusIds=new Set((S.goalsV7||[]).filter(g=>g.status==='focus90').map(g=>g.id));
  return (S.tasks||[]).filter(t=>!done(t)&&!canc(t)&&t.jDate<=d).sort((a,b)=>{
    const af=focusIds.has(a.goalId)?1:0,bf=focusIds.has(b.goalId)?1:0;
    return bf-af||v73TaskWeight(b)-v73TaskWeight(a)||(a.jDate||'').localeCompare(b.jDate||'');
  }).slice(0,5).map(t=>({...t,suggestedDate:next}));
}
function v73BuildReviewDialogs(){
  if(!document.getElementById('v73DailyReviewDialog'))document.body.insertAdjacentHTML('beforeend',`<dialog id="v73DailyReviewDialog"><form id="v73DailyReviewForm"><div class="dlgHead"><div><h3>مرور پایان روز</h3><p class="muted" id="v73DailyReviewDate"></p></div><button type="button" onclick="v73CloseReview('v73DailyReviewDialog')">×</button></div><input type="hidden" id="v73DailyReviewKey"><div class="formGrid"><label class="wide">مهم‌ترین برد امروز<textarea id="v73DailyWin"></textarea></label><label class="wide">علت اصلی کارهای ناتمام<textarea id="v73DailyUnfinished"></textarea></label><label>سطح انرژی<select id="v73DailyEnergy"><option value="0">ثبت نشده</option>${[1,2,3,4,5].map(n=>`<option value="${n}">${fa(n)} از ۵</option>`).join('')}</select></label><label>حال روحی<select id="v73DailyMood"><option value="0">ثبت نشده</option>${[1,2,3,4,5].map(n=>`<option value="${n}">${fa(n)} از ۵</option>`).join('')}</select></label><label class="wide">درس امروز<textarea id="v73DailyLesson"></textarea></label><label class="wide">یادداشت آزاد<textarea id="v73DailyNote"></textarea></label></div><section class="v73SuggestionBox"><h4>پیشنهاد برنامه برای فردا</h4><div id="v73TomorrowSuggestions"></div></section><footer><span></span><button type="button" onclick="v73CloseReview('v73DailyReviewDialog')">انصراف</button><button class="primary">ذخیره مرور</button></footer></form></dialog>`);
  if(!document.getElementById('v73WeeklyReviewDialog'))document.body.insertAdjacentHTML('beforeend',`<dialog id="v73WeeklyReviewDialog"><form id="v73WeeklyReviewForm"><div class="dlgHead"><div><h3>مرور هفتگی ده‌دقیقه‌ای</h3><p class="muted" id="v73WeeklyReviewDate"></p></div><button type="button" onclick="v73CloseReview('v73WeeklyReviewDialog')">×</button></div><input type="hidden" id="v73WeeklyReviewKey"><section id="v73WeeklyAutoReport" class="v73AutoReport"></section><div class="formGrid"><label class="wide">سه برد اصلی هفته<textarea id="v73WeeklyWins" placeholder="هر برد را در یک خط بنویس"></textarea></label><label class="wide">مهم‌ترین علت عقب‌افتادگی<textarea id="v73WeeklyCause"></textarea></label><label class="wide">کدام سیستم نیاز به اصلاح دارد؟<textarea id="v73WeeklySystem"></textarea></label><label class="wide">مهم‌ترین تصمیم هفته آینده<textarea id="v73WeeklyDecision"></textarea></label><label class="wide v73Approve"><input id="v73WeeklyApproved" type="checkbox"> برنامه پیشنهادی هفته آینده را بررسی و تأیید کردم.</label><label class="wide">یادداشت<textarea id="v73WeeklyNote"></textarea></label></div><footer><span></span><button type="button" onclick="v73CloseReview('v73WeeklyReviewDialog')">انصراف</button><button class="primary">ذخیره مرور هفتگی</button></footer></form></dialog>`);
  document.getElementById('v73DailyReviewForm').onsubmit=e=>{e.preventDefault();v73SaveDailyReview()};
  document.getElementById('v73WeeklyReviewForm').onsubmit=e=>{e.preventDefault();v73SaveWeeklyReview()};
}
function v73CloseReview(id){document.getElementById(id)?.close()}
window.v73CloseReview=v73CloseReview;
function v73OpenDailyReview(d=v73Today()){
  v73BuildReviewDialogs();const r=S.dailyReviews[d]||{};
  document.getElementById('v73DailyReviewKey').value=d;document.getElementById('v73DailyReviewDate').textContent=v73DateLabel(d);
  document.getElementById('v73DailyWin').value=r.win||'';document.getElementById('v73DailyUnfinished').value=r.unfinishedReason||'';document.getElementById('v73DailyEnergy').value=String(v73Num(r.energy));document.getElementById('v73DailyMood').value=String(v73Num(r.mood));document.getElementById('v73DailyLesson').value=r.lesson||'';document.getElementById('v73DailyNote').value=r.note||'';
  const suggestions=v73SuggestedTasks(d);document.getElementById('v73TomorrowSuggestions').innerHTML=suggestions.length?suggestions.map(t=>`<div><span>${esc(t.title)}</span><button type="button" onclick="v73MoveTaskTo('${t.id}','${t.suggestedDate}')">انتقال به ${fa(t.suggestedDate)}</button></div>`).join(''):'<p class="muted">پیشنهاد انتقالی وجود ندارد.</p>';
  document.getElementById('v73DailyReviewDialog').showModal();
}
function v73SaveDailyReview(){
  const d=document.getElementById('v73DailyReviewKey').value,old=S.dailyReviews[d]||{};
  S.dailyReviews[d]={date:d,win:document.getElementById('v73DailyWin').value.trim(),unfinishedReason:document.getElementById('v73DailyUnfinished').value.trim(),energy:v73Num(document.getElementById('v73DailyEnergy').value),mood:v73Num(document.getElementById('v73DailyMood').value),lesson:document.getElementById('v73DailyLesson').value.trim(),note:document.getElementById('v73DailyNote').value.trim(),createdAt:old.createdAt||v73Now(),updatedAt:v73Now()};
  if(typeof v7TouchMap==='function')v7TouchMap('dailyReviews',d);save();v73CloseReview('v73DailyReviewDialog');render();
}
function v73MoveTaskTo(id,date){const t=S.tasks.find(x=>x.id===id);if(!t)return;t.jDate=date;t.status=t.status==='عقب‌افتاده'?'انجام‌نشده':t.status;t.updatedAt=v73Now();save();const b=document.querySelector(`#v73TomorrowSuggestions button[onclick*="${id}"]`);if(b){b.textContent='منتقل شد';b.disabled=true}}
window.v73OpenDailyReview=v73OpenDailyReview;window.v73MoveTaskTo=v73MoveTaskTo;

function v73WeeklyAuto(start){
  const end=addDays(start,6),ds=v73DayRange(start,7),ts=inRange(start,end),m=met(ts);
  const runs=(S.systemRuns||[]).filter(r=>{const d=(r.startedAt||r.createdAt||'').slice(0,10);if(!d)return false;try{return dateToJ(new Date(d+'T00:00:00'))>=start&&dateToJ(new Date(d+'T00:00:00'))<=end}catch(_){return false}});
  const energies=ds.map(d=>v73Num(S.dailyReviews[d]?.energy)).filter(Boolean);
  const focus=(S.goalsV7||[]).filter(g=>g.status==='focus90');
  return {start,end,total:m.tot,done:m.d,late:m.l,completion:v73TaskCompletion(ts),systemRuns:runs.length,systemCompleted:runs.filter(r=>r.status==='completed').length,focus:v73Avg(focus.map(v72GoalProgress)),energy:energies.length?v73Avg(energies):0};
}
function v73WeeklyReportHtml(a){return `<div><span>تحقق کارها</span><b>${fa(a.completion)}٪</b></div><div><span>انجام‌شده</span><b>${fa(a.done)}</b></div><div><span>عقب‌افتاده</span><b>${fa(a.late)}</b></div><div><span>اجرای سیستم</span><b>${fa(a.systemCompleted)}/${fa(a.systemRuns)}</b></div><div><span>اهداف ۹۰روزه</span><b>${fa(a.focus)}٪</b></div><div><span>انرژی میانگین</span><b>${a.energy?fa(a.energy)+'/۵':'—'}</b></div>`}
function v73OpenWeeklyReview(start=week(v73Today()).start){
  v73BuildReviewDialogs();const r=S.weeklyReviews[start]||{},a=v73WeeklyAuto(start);
  document.getElementById('v73WeeklyReviewKey').value=start;document.getElementById('v73WeeklyReviewDate').textContent=`${fa(start)} تا ${fa(a.end)}`;document.getElementById('v73WeeklyAutoReport').innerHTML=v73WeeklyReportHtml(a);
  document.getElementById('v73WeeklyWins').value=r.wins||'';document.getElementById('v73WeeklyCause').value=r.cause||'';document.getElementById('v73WeeklySystem').value=r.systemChange||'';document.getElementById('v73WeeklyDecision').value=r.keyDecision||'';document.getElementById('v73WeeklyApproved').checked=!!r.approved;document.getElementById('v73WeeklyNote').value=r.note||'';
  document.getElementById('v73WeeklyReviewDialog').showModal();
}
function v73SaveWeeklyReview(){
  const start=document.getElementById('v73WeeklyReviewKey').value,old=S.weeklyReviews[start]||{},a=v73WeeklyAuto(start);
  S.weeklyReviews[start]={start,end:a.end,wins:document.getElementById('v73WeeklyWins').value.trim(),cause:document.getElementById('v73WeeklyCause').value.trim(),systemChange:document.getElementById('v73WeeklySystem').value.trim(),keyDecision:document.getElementById('v73WeeklyDecision').value.trim(),approved:document.getElementById('v73WeeklyApproved').checked,note:document.getElementById('v73WeeklyNote').value.trim(),auto:a,createdAt:old.createdAt||v73Now(),updatedAt:v73Now()};
  if(typeof v7TouchMap==='function')v7TouchMap('weeklyReviews',start);save();v73CloseReview('v73WeeklyReviewDialog');render();
}
window.v73OpenWeeklyReview=v73OpenWeeklyReview;

function v73ReviewsView(){
  const daily=Object.values(S.dailyReviews||{}).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,10),weekly=Object.values(S.weeklyReviews||{}).sort((a,b)=>String(b.start).localeCompare(String(a.start))).slice(0,8),current=week(v73Today()).start,a=v73WeeklyAuto(current);
  document.getElementById('app').innerHTML=`
    <section class="card v73ReviewHero"><div><h3>مرکز مرور و اصلاح مسیر</h3><p class="muted">مرور روزانه کوتاه و مرور هفتگی جمعه، داده خام را به تصمیم مدیریتی تبدیل می‌کند.</p></div><div><button onclick="v73OpenDailyReview('${v73Today()}')">مرور امروز</button><button onclick="v73OpenWeeklyReview('${current}')" class="primary">مرور این هفته</button></div></section>
    <section class="grid dash"><div class="c6 card"><h3>گزارش خودکار هفته جاری</h3><div class="v73AutoReport">${v73WeeklyReportHtml(a)}</div></div><div class="c6 card"><h3>پیشنهاد فردا</h3><div class="v73SuggestionList">${v73SuggestedTasks(v73Today()).slice(0,4).map(t=>`<div><span>${esc(t.title)}</span><button onclick="v73MoveTaskTo('${t.id}','${addDays(v73Today(),1)}')">انتقال</button></div>`).join('')||'<p class="muted">پیشنهادی وجود ندارد.</p>'}</div></div></section>
    <section class="grid dash"><div class="c6 card"><h3>مرورهای روزانه اخیر</h3>${daily.length?`<div class="v73ReviewList">${daily.map(r=>`<button onclick="v73OpenDailyReview('${r.date}')"><div><b>${fa(r.date)}</b><small>${esc(r.win||'بدون ثبت برد')}</small></div><span>${r.energy?fa(r.energy)+'/۵':'—'}</span></button>`).join('')}</div>`:'<div class="empty">مرور روزانه‌ای ثبت نشده است.</div>'}</div><div class="c6 card"><h3>مرورهای هفتگی اخیر</h3>${weekly.length?`<div class="v73ReviewList">${weekly.map(r=>`<button onclick="v73OpenWeeklyReview('${r.start}')"><div><b>${fa(r.start)} تا ${fa(r.end)}</b><small>${esc(r.keyDecision||'بدون تصمیم ثبت‌شده')}</small></div><span>${fa(r.auto?.completion||0)}٪</span></button>`).join('')}</div>`:'<div class="empty">مرور هفتگی‌ای ثبت نشده است.</div>'}</div></section>`;
}

// ===== افزودن مرور به صفحات روزانه و هفتگی =====
const v73DailyBase=daily;
daily=function(){
  v73DailyBase();const app=document.getElementById('app'),r=S.dailyReviews[sel],s=v73DailySummary(sel);
  app.insertAdjacentHTML('beforeend',`<section class="card v73InlineReview"><div><h3>مرور پایان روز</h3><p class="muted">${r?'مرور این روز ثبت شده است.':'برای تبدیل تجربه امروز به تصمیم فردا، مرور کوتاه را تکمیل کن.'}</p></div><div class="v73InlineMetrics"><span>تحقق <b>${fa(s.completion)}٪</b></span><span>انرژی <b>${s.energy?fa(s.energy)+'/۵':'—'}</b></span><span>حال روحی <b>${s.mood?fa(s.mood)+'/۵':'—'}</b></span></div><button onclick="v73OpenDailyReview('${sel}')" class="primary">${r?'ویرایش مرور':'ثبت مرور روز'}</button></section>`);
};window.daily=daily;
const v73WeeklyBase=weekly;
weekly=function(){
  v73WeeklyBase();const app=document.getElementById('app'),a=v73WeeklyAuto(wstart),r=S.weeklyReviews[wstart];
  app.insertAdjacentHTML('beforeend',`<section class="card v73InlineReview"><div><h3>مرور هفتگی جمعه</h3><p class="muted">${r?'گزارش این هفته ثبت شده است.':'مرور پنج‌سؤالی طراحی‌شده برای تکمیل در کمتر از ده دقیقه.'}</p></div><div class="v73InlineMetrics"><span>تحقق <b>${fa(a.completion)}٪</b></span><span>عقب‌افتاده <b>${fa(a.late)}</b></span><span>سیستم‌ها <b>${fa(a.systemCompleted)}/${fa(a.systemRuns)}</b></span></div><button onclick="v73OpenWeeklyReview('${wstart}')" class="primary">${r?'ویرایش مرور':'شروع مرور هفتگی'}</button></section>`);
};window.weekly=weekly;

// ===== گزارش‌ها =====
function v73PrintPersonal(){
  const score=v73LevelUpScore(),areas=(S.areas||[]).filter(a=>a.active!==false),focus=(S.goalsV7||[]).filter(g=>g.status==='focus90'),systems=(S.systems||[]).filter(s=>s.active!==false),wr=v73WeeklyAuto(week(v73Today()).start);
  document.getElementById('printArea').innerHTML=`<h1>گزارش شخصی Planner Life OS</h1><p>تاریخ: ${v73DateLabel(v73Today())}</p><div class="printCard"><h2>امتیاز LEVEL UP: ${fa(score)} از ۱۰۰</h2><p>${v73StatusText(score)}</p></div><div class="printCard"><h2>چرخ زندگی</h2><table><thead><tr><th>حوزه</th><th>وزن</th><th>امتیاز</th></tr></thead><tbody>${areas.map(a=>`<tr><td>${esc(a.title)}</td><td>${fa(a.weight)}٪</td><td>${fa(v73AreaScore(a))}٪</td></tr>`).join('')}</tbody></table></div><div class="printCard"><h2>اهداف ۹۰روزه</h2>${focus.map(g=>`<p><b>${esc(g.title)}</b> — ${fa(v72GoalProgress(g))}٪</p>`).join('')||'<p>ثبت نشده</p>'}</div><div class="printCard"><h2>سیستم‌های فعال</h2>${systems.map(s=>`<p><b>${esc(s.name)}</b> — پایبندی ${fa(v72SystemAdherence(s))}٪</p>`).join('')||'<p>ثبت نشده</p>'}</div><div class="printCard"><h2>هفته جاری</h2><p>تحقق کارها: ${fa(wr.completion)}٪ | انجام‌شده: ${fa(wr.done)} | عقب‌افتاده: ${fa(wr.late)} | اجرای سیستم‌ها: ${fa(wr.systemCompleted)}/${fa(wr.systemRuns)}</p></div>`;
  window.print();
}
function v73PrintProject(id){
  const p=v72Project(id);if(!p)return;const tasks=v72LinkedTasks(p.id),g=v72Goal(p.goalId);
  document.getElementById('printArea').innerHTML=`<h1>گزارش پروژه</h1><p>تاریخ گزارش: ${v73DateLabel(v73Today())}</p><div class="printCard"><h2>${esc(p.title)}</h2><p>هدف مادر: ${esc(g?.title||'—')}</p><p>وضعیت: ${esc(v72Label(V72_PROJECT_STATUSES,p.status))} | پیشرفت: ${fa(v72ProjectProgress(p))}٪</p><p>خروجی نهایی: ${esc(p.output||'—')}</p><p>معیار موفقیت: ${esc(p.success||'—')}</p><p>مهلت: ${fa(p.due||'—')}</p></div><div class="printCard"><h2>آورده‌ها</h2><p>مالی: ${fa(p.contributions?.financial||0)} | اعتباری: ${fa(p.contributions?.credibility||0)} | علمی: ${fa(p.contributions?.scientific||0)} | سازمانی: ${fa(p.contributions?.organizational||0)} | بین‌المللی: ${fa(p.contributions?.international||0)}</p></div><div class="printCard"><h2>کارهای پروژه</h2>${table(tasks).replace(/<button[\s\S]*?<\/button>/g,'')}</div>`;
  window.print();
}
function v73ReportsView(){
  const projects=(S.projects||[]).filter(p=>!['cancelled'].includes(p.status));
  document.getElementById('app').innerHTML=`<section class="card v73ReviewHero"><div><h3>گزارش‌ها</h3><p class="muted">خروجی شخصی و پروژه‌ای برای چاپ یا ذخیره PDF.</p></div><button onclick="v73PrintPersonal()" class="primary">گزارش شخصی PDF</button></section><section class="grid dash"><div class="c6 card"><h3>گزارش پروژه</h3><label>انتخاب پروژه<select id="v73ReportProject"><option value="">انتخاب کن...</option>${projects.map(p=>`<option value="${p.id}">${esc(p.title)}</option>`).join('')}</select></label><button style="margin-top:12px" onclick="const v=document.getElementById('v73ReportProject').value;if(v)v73PrintProject(v)">ساخت گزارش پروژه</button></div><div class="c6 card"><h3>خلاصه مدیریتی</h3><div class="v73AutoReport"><div><span>LEVEL UP</span><b>${fa(v73LevelUpScore())}٪</b></div><div><span>اهداف فعال</span><b>${fa(v72ActiveGoalCount())}</b></div><div><span>پروژه فعال</span><b>${fa((S.projects||[]).filter(p=>p.status==='active').length)}</b></div><div><span>سیستم فعال</span><b>${fa((S.systems||[]).filter(s=>s.active!==false).length)}</b></div><div><span>هشدار بحرانی</span><b>${fa(v73Alerts().filter(a=>a.level==='red').length)}</b></div></div></div></section>`;
}
window.v73PrintPersonal=v73PrintPersonal;window.v73PrintProject=v73PrintProject;

// ===== منو، رندر و راه‌اندازی =====
C.nav=[
  ['dashboard','📊','داشبورد','مرکز فرماندهی زندگی'],['inbox','📥','Inbox','ورودی‌ها / Inbox'],
  ['daily','☀️','روزانه','برنامه روزانه'],['weekly','🗓️','هفتگی','برنامه هفتگی'],['monthly','📅','ماهانه','برنامه ماهانه'],
  ['goalsV7','🎯','اهداف حرفه‌ای','اهداف حرفه‌ای و تمرکز ۹۰روزه'],['projectsV7','🧩','پروژه‌ها','پروژه‌های متصل به اهداف'],
  ['systemsV7','⚙️','سیستم‌ها','سیستم‌ساز شخصی'],['wheelV7','🧭','چرخ زندگی','چرخ زندگی و امتیاز LEVEL UP'],
  ['reviewsV7','📝','مرورها','مرور روزانه و هفتگی'],['reportsV7','📄','گزارش‌ها','گزارش‌های شخصی و پروژه‌ای'],
  ['habits','🟩','عادت‌ها','Habit Tracker'],['yearly','🗺️','سالانه','برنامه سالانه'],['goals','📦','اهداف قبلی','اهداف نسخه قبلی'],['tasks','✅','کارها','مدیریت کارها و جست‌وجو']
];
const v73RenderBase=render;
render=function(){
  if(view==='wheelV7'){v73WheelView();return}
  if(view==='reviewsV7'){v73ReviewsView();return}
  if(view==='reportsV7'){v73ReportsView();return}
  return v73RenderBase();
};window.render=render;
dash=v73Dashboard;window.dash=dash;

function v73Init(){
  v73EnsureState();v73BuildAreaDialog();v73BuildReviewDialogs();v73CaptureScore();
  const title=document.querySelector('title');if(title)title.textContent='Planner Life OS 7.5';
  const label=document.getElementById('calendarLabel');if(label)label.textContent='Planner Life OS 7.5 · مرکز فرماندهی زندگی';
  const pdf=document.getElementById('pdfBtn');if(pdf){pdf.textContent='گزارش PDF';pdf.onclick=v73PrintPersonal}
  buildNav();render();
}
v73Init();
