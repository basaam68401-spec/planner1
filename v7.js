'use strict';

// ===== Planner Life OS 7.5 =====
// لایه ارتقای امن: تقویم چندساله، نسخه‌بندی داده، بکاپ هفتگی و همگام‌سازی رکوردی.
const V7_SCHEMA = 'planner-life-os-v7.5';
const V7_BACKUP_DB = 'planner-life-os-backups';
const V7_BACKUP_STORE = 'snapshots';
const V7_MAX_BACKUPS = 8;
const V7_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function v7Clone(value){
  return value == null ? value : JSON.parse(JSON.stringify(value));
}
function v7Now(){ return new Date().toISOString(); }
function v7Ts(value){
  const raw = value?.updatedAt || value?._updatedAt || value?.createdAt || value || '';
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}
function v7CurrentJYear(){
  try { return toJ(new Date()).jy; } catch (_) { return 1405; }
}
function v7ValidYear(y){ return Number.isInteger(+y) && +y >= 1300 && +y <= 1600; }

// تقویم چندساله؛ تاریخ دیگر به سال ۱۴۰۵ محدود نیست.
jDate = function(s){
  const r = en(s).trim().replace(/[\/\.]/g,'-').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(!r) return '';
  const y=+r[1],m=+r[2],d=+r[3];
  return v7ValidYear(y) && m>0 && m<13 && d>0 && d<=ml(y,m) ? fmt(y,m,d) : '';
};
todayJ = function(){
  const j = toJ(new Date());
  return fmt(j.jy,j.jm,j.jd);
};
isoToJ = function(s){
  if(!s) return '';
  const d = new Date(String(s)+'T00:00:00');
  if(Number.isNaN(d.getTime())) return '';
  return dateToJ(d);
};
C.rep = [['none','بدون تکرار'],['daily','روزانه تا پایان سال انتخابی'],['weekly','هفتگی تا پایان سال انتخابی'],['monthly','ماهانه تا پایان سال انتخابی'],['yearly','سالانه']];

function v7EnsureMeta(state){
  const now=v7Now();
  state.meta = state.meta || {};
  state.meta.schemaVersion = V7_SCHEMA;
  state.meta.tombstones = state.meta.tombstones || {};
  state.meta.mapUpdatedAt = state.meta.mapUpdatedAt || {};
  state.settingsV7 = Object.assign({
    activeYear: v7CurrentJYear(),
    automaticWeeklyBackup: true,
    maxBackupSnapshots: V7_MAX_BACKUPS,
    lastAutoBackupAt: '',
    conflictStrategy: 'record-last-write-wins',
    fontFamily: 'Vazirmatn'
  }, state.settingsV7 || {});
  if(!v7ValidYear(state.settingsV7.activeYear)) state.settingsV7.activeYear=v7CurrentJYear();
  state.migrationLog = Array.isArray(state.migrationLog) ? state.migrationLog : [];
  if(!state.migrationLog.some(x=>x?.to===V7_SCHEMA)){
    state.migrationLog.push({from:state.meta.previousSchema||'planner-v6',to:V7_SCHEMA,at:now,note:'مهاجرت بدون حذف داده‌های قبلی'});
  }
  // ظرف‌های نسخه‌های بعدی از اکنون ایجاد می‌شوند تا مهاجرت‌های بعدی بدون شکست باشند.
  state.areas = Array.isArray(state.areas) ? state.areas : [];
  state.goalsV7 = Array.isArray(state.goalsV7) ? state.goalsV7 : [];
  state.projects = Array.isArray(state.projects) ? state.projects : [];
  state.systems = Array.isArray(state.systems) ? state.systems : [];
  state.systemRuns = Array.isArray(state.systemRuns) ? state.systemRuns : [];
  state.dailyReviews = state.dailyReviews || {};
  state.weeklyReviews = state.weeklyReviews || {};
  state.levelUpHistory = state.levelUpHistory || {};
  state.finance = state.finance || {balance:0,incomes:[],expenses:[],budgets:[],savings:[],investments:[]};
  state.financeTransactions = Array.isArray(state.financeTransactions) ? state.financeTransactions : [];
  state.financeBudgets = Array.isArray(state.financeBudgets) ? state.financeBudgets : [];
  state.financeAllocations = Array.isArray(state.financeAllocations) ? state.financeAllocations : [];
  state.loans = Array.isArray(state.loans) ? state.loans : [];
  state.installments = Array.isArray(state.installments) ? state.installments : [];
  state.contentItems = Array.isArray(state.contentItems) ? state.contentItems : [];
  state.dashboardLayout = Array.isArray(state.dashboardLayout) ? state.dashboardLayout : [];
  state.notifications = Array.isArray(state.notifications) ? state.notifications : [];
  state.autoReports = Array.isArray(state.autoReports) ? state.autoReports : [];

  const stateStamp = state.updatedAt || now;
  (state.tasks||[]).forEach(x=>{ if(!x.updatedAt) x.updatedAt=x.createdAt||stateStamp; });
  (state.inbox||[]).forEach(x=>{ if(!x.updatedAt) x.updatedAt=x.createdAt||stateStamp; });
  (state.habits?.items||[]).forEach(x=>{ if(!x.updatedAt) x.updatedAt=x.createdAt||stateStamp; });
  Object.values(state.goals||{}).forEach(arr=>(arr||[]).forEach(x=>{ if(!x.updatedAt) x.updatedAt=x.createdAt||stateStamp; }));
  (state.year?.pillars||[]).forEach(x=>{ if(!x.updatedAt) x.updatedAt=x.createdAt||stateStamp; });
  ['areas','goalsV7','projects','systems','systemRuns','financeTransactions','financeBudgets','financeAllocations','loans','installments','contentItems','notifications','autoReports'].forEach(k=>{
    (state[k]||[]).forEach(x=>{ if(!x.updatedAt) x.updatedAt=x.createdAt||stateStamp; });
  });
  return state;
}

function v7Migrate(){
  const before = v7Clone(S);
  const previous = S?.meta?.schemaVersion || '';
  if(previous !== V7_SCHEMA){
    v7CreateSnapshotFromState(before,'پیش از ارتقا به ۷.۵').catch(()=>{});
    S.meta = S.meta || {};
    S.meta.previousSchema = previous || 'planner-v6';
    S.meta.migratedAt = v7Now();
  }
  v7EnsureMeta(S);
  C.year = +S.settingsV7.activeYear;
  localStorage.setItem(K,JSON.stringify(S));
  window.S=S;
}

function v7TouchMap(group,key){
  v7EnsureMeta(S);
  S.meta.mapUpdatedAt[group]=S.meta.mapUpdatedAt[group]||{};
  S.meta.mapUpdatedAt[group][key]=v7Now();
}
function v7MarkDeleted(entity,recordId){
  if(!recordId) return;
  v7EnsureMeta(S);
  S.meta.tombstones[entity]=S.meta.tombstones[entity]||{};
  S.meta.tombstones[entity][recordId]=v7Now();
}

// ذخیره نسخه‌دار؛ کلید قدیمی عمداً حفظ شده تا اطلاعات کاربران فعلی باقی بماند.
const v7SaveBase = save;
save = function(){
  v7EnsureMeta(S);
  S.meta.schemaVersion=V7_SCHEMA;
  S.settingsV7.activeYear=C.year;
  return v7SaveBase();
};
window.save=save;

// ===== کنترل سال کاری =====
function v7KnownYears(){
  const set=new Set([v7CurrentJYear(),1405,C.year]);
  (S.tasks||[]).forEach(t=>{const y=par(t.jDate||'').jy;if(v7ValidYear(y))set.add(y)});
  (S.goalsV7||[]).forEach(g=>{const y=par(g.due||'').jy;if(v7ValidYear(y))set.add(y)});
  const cur=v7CurrentJYear();
  for(let y=cur-2;y<=cur+4;y++) set.add(y);
  return [...set].filter(v7ValidYear).sort((a,b)=>a-b);
}
function v7SyncYearUi(){
  const select=document.getElementById('activeYearSelect');
  if(select){
    const years=v7KnownYears();
    select.innerHTML=years.map(y=>`<option value="${y}" ${y===C.year?'selected':''}>${fa(y)}</option>`).join('');
  }
  const brand=document.getElementById('brandYear'); if(brand)brand.textContent=fa(C.year);
  const label=document.getElementById('calendarLabel'); if(label)label.textContent='تقویم شمسی چندساله · سال کاری '+fa(C.year);
  const title=document.querySelector('title'); if(title)title.textContent='Planner Life OS 7.5';
}
function v7SetActiveYear(y){
  y=+y;
  if(!v7ValidYear(y)) return;
  C.year=y;
  v7EnsureMeta(S);
  S.settingsV7.activeYear=y;
  const p=par(sel||'');
  if(!v7ValidYear(p.jy)||p.jy!==y) sel=fmt(y,1,1);
  mon=sel.slice(0,7);
  wstart=week(sel).start;
  save();
  render();
}
window.v7SetActiveYear=v7SetActiveYear;

const v7RenderBase=render;
render=function(){
  // در نماهای تقویمی، سال از تاریخ انتخاب‌شده پیروی می‌کند.
  if(['daily','weekly','monthly'].includes(view)){
    const source=view==='monthly' ? (mon+'-01') : sel;
    const y=par(source||'').jy;
    if(v7ValidYear(y) && y!==C.year){ C.year=y; if(S.settingsV7)S.settingsV7.activeYear=y; }
  }
  v7SyncYearUi();
  const out=v7RenderBase();
  v7SyncYearUi();
  return out;
};
window.render=render;

const v7SaveTaskBase=saveTask;
saveTask=function(){
  const jd=jDate(document.getElementById('jdate')?.value||'');
  if(jd){
    C.year=par(jd).jy;
    v7EnsureMeta(S);
    S.settingsV7.activeYear=C.year;
  }
  return v7SaveTaskBase();
};
window.saveTask=saveTask;

// ===== حذف امن و tombstone برای همگام‌سازی =====
function v7BindSafeTaskDelete(){
  const b=document.getElementById('delBtn');
  if(!b)return;
  b.onclick=()=>{
    if(!edit)return;
    v7MarkDeleted('tasks',edit);
    S.tasks=S.tasks.filter(t=>t.id!==edit);
    save();closeDlg();render();
  };
}

delInbox=function(i){v7MarkDeleted('inbox',i);S.inbox=S.inbox.filter(x=>x.id!==i);save();render()};
window.delInbox=delInbox;

goalDel=function(k,gid){
  if(!confirm('این هدف حذف شود؟'))return;
  v7MarkDeleted('goals.'+k,gid);
  S.goals[k]=S.goals[k].filter(g=>g.id!==gid);save();render();
};
goalAdd=function(k){
  const now=v7Now();
  S.goals[k].unshift({id:id(),title:'',why:'',metric:'',target:'',due:'',steps:[],createdAt:now,updatedAt:now});save();render();
};
goalAddStep=function(k,gid){
  const g=goalFind(k,gid),inp=document.getElementById('step_'+gid);
  if(!g||!inp||!inp.value.trim())return;
  g.steps=g.steps||[];g.steps.push({id:id(),title:inp.value.trim(),done:false});g.updatedAt=v7Now();save();render();
};
goalToggleStep=function(k,gid,sid){
  const g=goalFind(k,gid),s=g?.steps?.find(x=>x.id===sid);if(!s)return;s.done=!s.done;g.updatedAt=v7Now();save();render();
};
goalDelStep=function(k,gid,sid){
  const g=goalFind(k,gid);if(!g)return;g.steps=(g.steps||[]).filter(s=>s.id!==sid);g.updatedAt=v7Now();save();render();
};
window.goalDel=goalDel;window.goalAdd=goalAdd;window.goalAddStep=goalAddStep;window.goalToggleStep=goalToggleStep;window.goalDelStep=goalDelStep;

habitDelete=function(hid){
  if(!confirm('این عادت حذف شود؟'))return;
  v7MarkDeleted('habits',hid);S.habits.items=S.habits.items.filter(h=>h.id!==hid);delete S.habits.checks[hid];save();render();
};
const v7HabitToggleBase=habitToggle;
habitToggle=function(hid,d){v7TouchMap('habitChecks',hid+'|'+d);return v7HabitToggleBase(hid,d)};
window.habitDelete=habitDelete;window.habitToggle=habitToggle;

function deletePillar(pid){
  v7MarkDeleted('pillars',pid);S.year.pillars=S.year.pillars.filter(x=>x.id!==pid);save();render();
}
window.deletePillar=deletePillar;
pillar=function(p){return`<div class="task" data-p="${p.id}"><div class="formGrid"><label>عنوان<input class="pt" value="${esc(p.title)}"></label><label>شاخص<input class="pm" value="${esc(p.metric)}"></label><label>هدف<input class="pg" value="${esc(p.target)}"></label><label>پیشرفت<input class="pp" type="number" min="0" max="100" value="${+p.progress||0}"></label><label class="wide">یادداشت<textarea class="pn">${esc(p.note||'')}</textarea></label></div><button class="danger" onclick="deletePillar('${p.id}')">حذف ستون</button></div>`};
window.pillar=pillar;

// ===== IndexedDB Backup =====
function v7OpenBackupDb(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)) return reject(new Error('IndexedDB پشتیبانی نمی‌شود.'));
    const req=indexedDB.open(V7_BACKUP_DB,1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(V7_BACKUP_STORE)){
        const store=db.createObjectStore(V7_BACKUP_STORE,{keyPath:'id'});
        store.createIndex('createdAt','createdAt',{unique:false});
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error('خطای بانک بکاپ'));
  });
}
function v7DbRequest(req){
  return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
}
async function v7ListBackups(){
  const db=await v7OpenBackupDb();
  try{
    const tx=db.transaction(V7_BACKUP_STORE,'readonly');
    const list=await v7DbRequest(tx.objectStore(V7_BACKUP_STORE).getAll());
    return (list||[]).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  }finally{db.close()}
}
async function v7PruneBackups(){
  const max=+(S.settingsV7?.maxBackupSnapshots||V7_MAX_BACKUPS);
  const list=await v7ListBackups();
  if(list.length<=max)return;
  const db=await v7OpenBackupDb();
  try{
    const tx=db.transaction(V7_BACKUP_STORE,'readwrite');
    list.slice(max).forEach(x=>tx.objectStore(V7_BACKUP_STORE).delete(x.id));
  }finally{db.close()}
}
async function v7CreateSnapshotFromState(state,reason='دستی'){
  if(!state)return;
  const now=v7Now();
  const row={id:'backup_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),createdAt:now,reason,schema:state?.meta?.schemaVersion||'planner-v6',state:v7Clone(state)};
  const db=await v7OpenBackupDb();
  try{
    const tx=db.transaction(V7_BACKUP_STORE,'readwrite');
    await v7DbRequest(tx.objectStore(V7_BACKUP_STORE).put(row));
  }finally{db.close()}
  await v7PruneBackups();
  return row;
}
async function v7CreateSnapshot(reason='دستی'){
  const row=await v7CreateSnapshotFromState(S,reason);
  if(reason.includes('هفتگی')){
    S.settingsV7.lastAutoBackupAt=row.createdAt;
    localStorage.setItem(K,JSON.stringify(S));
  }
  await v7RenderBackupList();
  return row;
}
async function v7DeleteBackup(id){
  const db=await v7OpenBackupDb();
  try{const tx=db.transaction(V7_BACKUP_STORE,'readwrite');await v7DbRequest(tx.objectStore(V7_BACKUP_STORE).delete(id))}finally{db.close()}
  await v7RenderBackupList();
}
async function v7RestoreBackup(id){
  const list=await v7ListBackups();const row=list.find(x=>x.id===id);if(!row)return;
  if(!confirm('اطلاعات فعلی با این نسخه پشتیبان جایگزین شود؟ قبل از بازیابی، یک بکاپ اضطراری ساخته می‌شود.'))return;
  await v7CreateSnapshotFromState(S,'پیش از بازیابی');
  S=Object.assign(seed(),v7Clone(row.state));v7EnsureMeta(S);C.year=+S.settingsV7.activeYear;localStorage.setItem(K,JSON.stringify(S));window.S=S;
  if(typeof cloudScheduleSave==='function')cloudScheduleSave(true);
  render();await v7RenderBackupList();
  alert('نسخه پشتیبان بازیابی شد.');
}
window.v7DeleteBackup=v7DeleteBackup;window.v7RestoreBackup=v7RestoreBackup;

function v7BackupLabel(reason){
  if(reason==='weekly-auto')return'خودکار هفتگی';
  return reason||'دستی';
}
async function v7RenderBackupList(){
  const box=document.getElementById('backupList');if(!box)return;
  try{
    const list=await v7ListBackups();
    box.innerHTML=list.length?list.map(x=>{
      const dt=new Date(x.createdAt).toLocaleString('fa-IR');
      return`<article class="backupRow"><div><b>${esc(v7BackupLabel(x.reason))}</b><small>${esc(dt)} · ${esc(x.schema||'')}</small></div><div><button type="button" onclick="v7RestoreBackup('${x.id}')">بازیابی</button><button type="button" class="danger" onclick="v7DeleteBackup('${x.id}')">حذف</button></div></article>`
    }).join(''):'<div class="empty">هنوز نسخه پشتیبان محلی ایجاد نشده است.</div>';
  }catch(e){box.innerHTML='<div class="warn">نمایش بکاپ‌ها ممکن نشد: '+esc(e.message||e)+'</div>'}
}
function v7DownloadJson(){
  v7EnsureMeta(S);
  const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=u;a.download=`planner-life-os-${C.year}-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(u);
}
backup=v7DownloadJson;window.backup=backup;

function v7ImportFile(file){
  if(!file)return;
  const rd=new FileReader();
  rd.onload=async()=>{
    try{
      const j=JSON.parse(rd.result);
      if(!Array.isArray(j.tasks))throw new Error('ساختار فایل معتبر نیست.');
      if(!confirm('اطلاعات فعلی با فایل انتخابی جایگزین شود؟'))return;
      await v7CreateSnapshotFromState(S,'پیش از ورود فایل');
      S=Object.assign(seed(),j);v7EnsureMeta(S);C.year=+S.settingsV7.activeYear;localStorage.setItem(K,JSON.stringify(S));window.S=S;render();
      if(typeof cloudScheduleSave==='function')cloudScheduleSave(true);
      alert('فایل با موفقیت بازیابی شد.');
    }catch(e){alert(e.message||'فایل معتبر نیست')}
  };
  rd.readAsText(file);
}
async function v7MaybeWeeklyBackup(){
  v7EnsureMeta(S);
  if(!S.settingsV7.automaticWeeklyBackup)return;
  const last=Date.parse(S.settingsV7.lastAutoBackupAt||'');
  if(!Number.isFinite(last)||Date.now()-last>=V7_WEEK_MS){
    try{await v7CreateSnapshot('weekly-auto')}catch(e){console.warn('weekly backup failed',e)}
  }
}

function v7BindBackupUi(){
  const dialog=document.getElementById('backupDialog');
  const open=document.getElementById('backupBtn');
  if(open)open.onclick=()=>{dialog?.showModal();v7RenderBackupList()};
  const close=document.getElementById('closeBackup');if(close)close.onclick=()=>dialog.close();
  const snap=document.getElementById('createSnapshotBtn');if(snap)snap.onclick=async()=>{await v7CreateSnapshot('دستی محلی');alert('نسخه پشتیبان محلی ساخته شد.')};
  const dl=document.getElementById('downloadBackupBtn');if(dl)dl.onclick=v7DownloadJson;
  const input=document.getElementById('restoreBackupInput');if(input)input.onchange=e=>{v7ImportFile(e.target.files?.[0]);e.target.value=''};
}

// ===== Merge رکوردی برای دو دستگاه =====
function v7MergeTombstones(a,b){
  const out={};
  for(const group of new Set([...Object.keys(a||{}),...Object.keys(b||{})])){
    out[group]={};
    for(const id of new Set([...Object.keys(a?.[group]||{}),...Object.keys(b?.[group]||{})])){
      const av=a?.[group]?.[id]||'',bv=b?.[group]?.[id]||'';
      out[group][id]=v7Ts(av)>=v7Ts(bv)?av:bv;
    }
  }
  return out;
}
function v7MergeArray(localArr,remoteArr,entity,tombstones){
  const map=new Map();
  for(const item of [...(localArr||[]),...(remoteArr||[])]){
    if(!item?.id)continue;
    const prev=map.get(item.id);
    if(!prev||v7Ts(item)>=v7Ts(prev))map.set(item.id,v7Clone(item));
  }
  const deleted=tombstones?.[entity]||{};
  return [...map.values()].filter(item=>v7Ts(deleted[item.id])<v7Ts(item));
}
function v7MergeMap(localMap,remoteMap,localState,remoteState,group,meta){
  const out={};
  for(const key of new Set([...Object.keys(localMap||{}),...Object.keys(remoteMap||{})])){
    if(!(key in (localMap||{})))out[key]=v7Clone(remoteMap[key]);
    else if(!(key in (remoteMap||{})))out[key]=v7Clone(localMap[key]);
    else{
      const lt=v7Ts(meta?.local?.[group]?.[key]||localState?.updatedAt);
      const rt=v7Ts(meta?.remote?.[group]?.[key]||remoteState?.updatedAt);
      out[key]=v7Clone(rt>lt?remoteMap[key]:localMap[key]);
    }
  }
  return out;
}
function v7MergeHabitChecks(a,b,localState,remoteState,meta){
  const out={};
  for(const hid of new Set([...Object.keys(a||{}),...Object.keys(b||{})])){
    out[hid]={};
    for(const d of new Set([...Object.keys(a?.[hid]||{}),...Object.keys(b?.[hid]||{})])){
      if(!(d in (a?.[hid]||{})))out[hid][d]=b[hid][d];
      else if(!(d in (b?.[hid]||{})))out[hid][d]=a[hid][d];
      else{
        const key=hid+'|'+d;
        const lt=v7Ts(meta?.local?.habitChecks?.[key]||localState?.updatedAt),rt=v7Ts(meta?.remote?.habitChecks?.[key]||remoteState?.updatedAt);
        out[hid][d]=rt>lt?b[hid][d]:a[hid][d];
      }
    }
  }
  return out;
}
function v7MergeStates(localState,remoteState){
  const l=v7EnsureMeta(v7Clone(localState||seed())),r=v7EnsureMeta(v7Clone(remoteState||seed()));
  const lts=v7Ts(l.updatedAt),rts=v7Ts(r.updatedAt),newer=rts>lts?r:l;
  const out=v7Clone(newer);
  out.meta=out.meta||{};
  out.meta.tombstones=v7MergeTombstones(l.meta?.tombstones,r.meta?.tombstones);
  out.meta.mapUpdatedAt=Object.assign({},l.meta?.mapUpdatedAt||{},r.meta?.mapUpdatedAt||{});
  const t=out.meta.tombstones;
  out.tasks=v7MergeArray(l.tasks,r.tasks,'tasks',t);
  out.inbox=v7MergeArray(l.inbox,r.inbox,'inbox',t);
  out.habits=out.habits||{items:[],checks:{}};
  out.habits.items=v7MergeArray(l.habits?.items,r.habits?.items,'habits',t);
  out.habits.checks=v7MergeHabitChecks(l.habits?.checks,r.habits?.checks,l,r,{local:l.meta?.mapUpdatedAt,remote:r.meta?.mapUpdatedAt});
  out.goals=out.goals||{};
  for(const k of new Set([...Object.keys(l.goals||{}),...Object.keys(r.goals||{})]))out.goals[k]=v7MergeArray(l.goals?.[k],r.goals?.[k],'goals.'+k,t);
  out.year=out.year||{};
  out.year.pillars=v7MergeArray(l.year?.pillars,r.year?.pillars,'pillars',t);
  out.daily=v7MergeMap(l.daily,r.daily,l,r,'daily',{local:l.meta?.mapUpdatedAt,remote:r.meta?.mapUpdatedAt});
  out.weekly=v7MergeMap(l.weekly,r.weekly,l,r,'weekly',{local:l.meta?.mapUpdatedAt,remote:r.meta?.mapUpdatedAt});
  out.monthly=v7MergeMap(l.monthly,r.monthly,l,r,'monthly',{local:l.meta?.mapUpdatedAt,remote:r.meta?.mapUpdatedAt});
  ['areas','goalsV7','projects','systems','systemRuns','financeTransactions','financeBudgets','financeAllocations','loans','installments','contentItems','notifications','autoReports'].forEach(k=>{out[k]=v7MergeArray(l[k],r[k],k,t)});
  out.dailyReviews=v7MergeMap(l.dailyReviews,r.dailyReviews,l,r,'dailyReviews',{local:l.meta?.mapUpdatedAt,remote:r.meta?.mapUpdatedAt});
  out.weeklyReviews=v7MergeMap(l.weeklyReviews,r.weeklyReviews,l,r,'weeklyReviews',{local:l.meta?.mapUpdatedAt,remote:r.meta?.mapUpdatedAt});
  out.levelUpHistory=v7MergeMap(l.levelUpHistory,r.levelUpHistory,l,r,'levelUpHistory',{local:l.meta?.mapUpdatedAt,remote:r.meta?.mapUpdatedAt});
  out.meta.schemaVersion=V7_SCHEMA;
  out.updatedAt=v7Ts(l.updatedAt)>=v7Ts(r.updatedAt)?l.updatedAt:r.updatedAt;
  return v7EnsureMeta(out);
}

cloudPullNow=async function(){
  if(!cloud.user||!cloud.client)return;
  try{
    const req=cloud.client.from(SUPABASE_STATE_TABLE).select('state,updated_at,local_updated_at').eq('user_id',cloud.user.id).maybeSingle();
    const {data,error}=await cloudWithTimeout(req,CLOUD_DATA_TIMEOUT_MS,'timeout-pull');
    if(error)throw error;
    cloud.ready=true;
    if(!data||!data.state){cloud.status='ابر خالی بود؛ اطلاعات لوکال روی Supabase ذخیره شد.';cloudPaint();await cloudSaveNow(true);return}
    if(!Array.isArray(data.state.tasks)){cloud.status='داده ابری معتبر نبود؛ اطلاعات لوکال حفظ شد.';cloudPaint();return}
    const merged=v7MergeStates(S,data.state);
    const localChanged=JSON.stringify(merged)!==JSON.stringify(S);
    const remoteChanged=JSON.stringify(merged)!==JSON.stringify(data.state);
    if(localChanged)await v7CreateSnapshotFromState(S,'پیش از همگام‌سازی ابری');
    cloud.applying=true;S=merged;localStorage.setItem(K,JSON.stringify(S));window.S=S;cloud.applying=false;C.year=+S.settingsV7.activeYear;
    cloud.status=localChanged||remoteChanged?'همگام‌سازی رکوردی انجام شد':'اطلاعات لوکال و ابری یکسان است.';cloudPaint();render();
    if(remoteChanged)setTimeout(()=>cloudSaveNow(true),100);
  }catch(e){cloud.ready=false;cloud.status='دریافت ابری ناموفق؛ حالت لوکال فعال است';cloudPaint();cloudMsg('دریافت از Supabase انجام نشد: '+cloudAuthError(e),true)}
};
cloudSaveNow=async function(force=false){
  if(!cloud.user||!cloud.client||cloud.applying)return;
  try{
    v7EnsureMeta(S);
    const clean=v7Clone(S);cloud.status='در حال ذخیره ابری...';cloudPaint();
    const payload={user_id:cloud.user.id,state:clean,local_updated_at:clean.updatedAt||v7Now(),schema:V7_SCHEMA};
    const req=cloud.client.from(SUPABASE_STATE_TABLE).upsert(payload,{onConflict:'user_id'});
    const {error}=await cloudWithTimeout(req,CLOUD_DATA_TIMEOUT_MS,'timeout-save');if(error)throw error;
    cloud.ready=true;cloud.status='ذخیره ابری انجام شد';cloudPaint();if(force)cloudMsg('اطلاعات با Supabase همگام شد.')
  }catch(e){cloud.status='ذخیره ابری ناموفق؛ داده‌ها لوکال حفظ شد';cloudPaint();cloudMsg('ذخیره ابری انجام نشد: '+cloudAuthError(e),true)}
};
window.cloudPullNow=cloudPullNow;window.cloudSaveNow=cloudSaveNow;

function v7Init(){
  v7Migrate();
  v7BindSafeTaskDelete();
  v7BindBackupUi();
  const select=document.getElementById('activeYearSelect');if(select)select.onchange=e=>v7SetActiveYear(e.target.value);
  if(typeof fill==='function')fill('#repeat',C.rep);
  const jdate=document.getElementById('jdate');if(jdate)jdate.placeholder='1405-04-03';
  v7SyncYearUi();
  v7MaybeWeeklyBackup();
  render();
}

v7Init();
