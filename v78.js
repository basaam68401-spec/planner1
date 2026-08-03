'use strict';

// ===== Planner Life for Soil 7.8 =====
// تایم‌باکسینگ دوحالته افقی و عمودی روی نسخه کامل 7.7.
const V78_SCHEMA='planner-life-for-soil-v7.8';
const V78_PX_PER_MINUTE=1.25;

function v78EnsureState(){
  S.meta=S.meta||{};
  S.meta.schemaVersion=V78_SCHEMA;
  S.settingsV7=S.settingsV7||{};
  if(!['horizontal','vertical'].includes(S.settingsV7.timeboxingView))S.settingsV7.timeboxingView='horizontal';
  localStorage.setItem(K,JSON.stringify(S));
  window.S=S;
}
function v78TimeMode(){return S.settingsV7?.timeboxingView==='vertical'?'vertical':'horizontal'}
function v78SetTimeMode(mode){
  if(!['horizontal','vertical'].includes(mode))return;
  S.settingsV7=S.settingsV7||{};
  S.settingsV7.timeboxingView=mode;
  save();
  render();
}
function v78TimeToMinute(value){
  const match=String(value||'').match(/^(\d{1,2}):(\d{2})/);
  if(!match)return null;
  const hour=Number(match[1]),minute=Number(match[2]);
  if(hour<0||hour>23||minute<0||minute>59)return null;
  return hour*60+minute;
}
function v78MinuteToTime(value){
  const minute=Math.max(0,Math.min(1439,Math.round(Number(value)||0)));
  return `${pad(Math.floor(minute/60))}:${pad(minute%60)}`;
}
function v78TaskProgress(task){
  if(done(task))return 100;
  return Math.max(0,Math.min(100,Math.round(Number(task?.progress)||0)));
}
function v78TimedTasks(tasks){
  const rows=[];
  for(const task of tasks){
    const start=v78TimeToMinute(task.start);
    if(start===null)continue;
    let end=v78TimeToMinute(task.end);
    if(end===null||end<=start)end=Math.min(1440,start+60);
    if(end>1440)end=1440;
    rows.push({task,start,end,progress:v78TaskProgress(task),lane:0,laneCount:1});
  }
  rows.sort((a,b)=>a.start-b.start||a.end-b.end);

  // هر گروه هم‌پوشان، مسیرهای جدا می‌گیرد تا تایم‌باکس‌ها روی هم نیفتند.
  let group=[],groupEnd=-1;
  const finishGroup=()=>{
    if(!group.length)return;
    const laneEnds=[];
    for(const row of group){
      let lane=laneEnds.findIndex(end=>end<=row.start);
      if(lane<0)lane=laneEnds.length;
      row.lane=lane;
      laneEnds[lane]=row.end;
    }
    const count=Math.max(1,laneEnds.length);
    group.forEach(row=>row.laneCount=count);
    group=[];groupEnd=-1;
  };
  for(const row of rows){
    if(group.length&&row.start>=groupEnd)finishGroup();
    group.push(row);
    groupEnd=Math.max(groupEnd,row.end);
  }
  finishGroup();
  return rows;
}
function v78Unscheduled(tasks){return tasks.filter(task=>v78TimeToMinute(task.start)===null)}
function v78DurationLabel(start,end){
  const duration=Math.max(0,end-start),hours=Math.floor(duration/60),minutes=duration%60;
  if(hours&&minutes)return `${fa(hours)} ساعت و ${fa(minutes)} دقیقه`;
  if(hours)return `${fa(hours)} ساعت`;
  return `${fa(minutes)} دقیقه`;
}
function v78EventClass(task){return `${done(task)?' isDone':''}${late(task)?' isLate':''}`}
function v78EventContent(row,compact=false){
  const task=row.task,p=row.progress,time=`${fa(v78MinuteToTime(row.start))} تا ${fa(v78MinuteToTime(Math.min(1439,row.end)))}`;
  return `<div class="v78EventFill" aria-hidden="true"></div><div class="v78EventContent"><b>${esc(task.title||'فعالیت بدون عنوان')}</b><small>${time} · ${v78DurationLabel(row.start,row.end)}</small>${compact?'':`<div class="v78EventProgress"><i style="width:${p}%"></i></div>`}<span>${fa(p)}٪ پیشرفت</span></div>`;
}
function v78UnscheduledHtml(tasks){
  const rows=v78Unscheduled(tasks);
  if(!rows.length)return'';
  return `<div class="v78Unscheduled"><b>فعالیت‌های بدون ساعت</b><div>${rows.map(task=>`<button type="button" onclick="openDlg(S.tasks.find(x=>x.id==='${task.id}'))">${esc(task.title)}</button>`).join('')}</div></div>`;
}
function v78Legend(){
  return `<div class="v78Legend"><span><i class="done"></i>بخش انجام‌شده</span><span><i class="remaining"></i>بخش باقی‌مانده</span><span><i class="late"></i>فعالیت عقب‌افتاده</span><small>با افزایش درصد پیشرفت، بخش سبز هر تایم‌باکس بیشتر و بخش قرمز آن کمتر می‌شود.</small></div>`;
}
function v78TimeSummary(tasks){
  const rows=v78TimedTasks(tasks),planned=rows.reduce((sum,row)=>sum+(row.end-row.start),0),weighted=rows.reduce((sum,row)=>sum+(row.end-row.start)*row.progress/100,0),free=Math.max(0,1440-planned);
  return `<div class="v78TimeSummary"><span>زمان برنامه‌ریزی‌شده <b>${v78DurationLabel(0,planned)}</b></span><span>زمان تحقق‌یافته <b>${v78DurationLabel(0,Math.round(weighted))}</b></span><span>زمان آزاد ثبت‌نشده <b>${v78DurationLabel(0,free)}</b></span><span>تعداد تایم‌باکس <b>${fa(rows.length)}</b></span></div>`;
}
function v78HorizontalTimeline(date,tasks){
  const rows=v78TimedTasks(tasks),ppm=V78_PX_PER_MINUTE,width=1440*ppm,maxLane=Math.max(1,...rows.map(row=>row.laneCount)),height=92+maxLane*76;
  const hourLines=Array.from({length:25},(_,hour)=>`<i class="v78HHourLine" style="right:${hour*60*ppm}px"></i>`).join('');
  const halfLines=Array.from({length:24},(_,hour)=>`<i class="v78HHalfLine" style="right:${(hour*60+30)*ppm}px"></i>`).join('');
  const labels=Array.from({length:24},(_,hour)=>`<span class="v78HLabel" style="right:${hour*60*ppm}px">${fa(pad(hour)+':00')}</span>`).join('')+`<span class="v78HLabel end" style="right:${1439*ppm}px">${fa('23:59')}</span>`;
  const events=rows.map(row=>{
    const eventWidth=Math.max(18,(row.end-row.start)*ppm),right=Math.min(row.start*ppm,Math.max(0,width-eventWidth)),top=52+row.lane*76;
    return `<article class="v78TimeboxEvent horizontal${v78EventClass(row.task)}" style="--progress:${row.progress}%;right:${right}px;width:${eventWidth}px;top:${top}px" title="${esc(row.task.title)}" onclick="event.stopPropagation();openDlg(S.tasks.find(x=>x.id==='${row.task.id}'))">${v78EventContent(row,eventWidth<115)}</article>`;
  }).join('');
  return `${v78UnscheduledHtml(tasks)}${v78Legend()}<div class="v78HorizontalScroller" dir="rtl"><div class="v78HorizontalTrack" style="width:${width}px;height:${height}px" onclick="v78HorizontalClick(event)">${hourLines}${halfLines}${labels}${events||'<div class="v78EmptyTimeline">برای ساخت اولین تایم‌باکس، روی بازه زمانی دلخواه کلیک کن.</div>'}</div></div>`;
}
function v78VerticalTimeline(date,tasks){
  const rows=v78TimedTasks(tasks);
  const lines=Array.from({length:25},(_,hour)=>`<i class="v78VHourLine" style="top:${hour*60}px"></i>`).join('');
  const halfLines=Array.from({length:24},(_,hour)=>`<i class="v78VHalfLine" style="top:${hour*60+30}px"></i>`).join('');
  const labels=Array.from({length:24},(_,hour)=>`<span class="v78VLabel" style="top:${hour*60}px">${fa(pad(hour)+':00')}</span>`).join('')+`<span class="v78VLabel end" style="top:1439px">${fa('23:59')}</span>`;
  const events=rows.map(row=>{
    const usable=94,laneWidth=usable/row.laneCount,right=2+row.lane*laneWidth,eventWidth=Math.max(12,laneWidth-1),height=Math.max(38,row.end-row.start),top=Math.min(row.start,1440-height);
    return `<article class="v78TimeboxEvent vertical${v78EventClass(row.task)}" style="--progress:${row.progress}%;top:${top}px;height:${height}px;right:${right}%;width:${eventWidth}%" title="${esc(row.task.title)}" onclick="event.stopPropagation();openDlg(S.tasks.find(x=>x.id==='${row.task.id}'))">${v78EventContent(row,height<66)}</article>`;
  }).join('');
  return `${v78UnscheduledHtml(tasks)}${v78Legend()}<div class="v78VerticalWrap"><div class="v78VerticalLabels">${labels}</div><div class="v78VerticalCanvas" onclick="v78VerticalClick(event)">${lines}${halfLines}${events||'<div class="v78EmptyTimeline verticalEmpty">برای ساخت اولین تایم‌باکس، روی بازه زمانی دلخواه کلیک کن.</div>'}</div></div>`;
}
function v78Timeboxing(date,tasks){
  const mode=v78TimeMode();
  return `<section class="card v78TimeboxingCard"><div class="v78TimeboxingHead"><div><small>از ساعت ${fa('00:00')} تا ${fa('23:59')}</small><h3>تایم‌باکسینگ روزانه</h3><p class="muted">نمای دلخواه را انتخاب کن؛ انتخاب تو برای دفعات بعد ذخیره می‌شود.</p></div><div class="v78TimeActions"><div class="v78ViewSwitch" role="group" aria-label="انتخاب نمای تایم‌باکسینگ"><button type="button" class="${mode==='horizontal'?'active':''}" onclick="v78SetTimeMode('horizontal')">↔ نمای افقی</button><button type="button" class="${mode==='vertical'?'active':''}" onclick="v78SetTimeMode('vertical')">↕ نمای عمودی</button></div><button type="button" class="primary" onclick="openDlg(null,'${date}')">+ تایم‌باکس جدید</button></div></div>${v78TimeSummary(tasks)}${mode==='horizontal'?v78HorizontalTimeline(date,tasks):v78VerticalTimeline(date,tasks)}</section>`;
}
function v78OpenAtMinute(minute){
  let start=Math.round((Number(minute)||0)/30)*30;
  start=Math.max(0,Math.min(1410,start));
  const end=Math.min(1439,start+60);
  openDlg(null,sel);
  const startInput=document.getElementById('start'),endInput=document.getElementById('end');
  if(startInput)startInput.value=v78MinuteToTime(start);
  if(endInput)endInput.value=v78MinuteToTime(end);
}
function v78HorizontalClick(event){
  if(event.target.closest('.v78TimeboxEvent'))return;
  const track=event.currentTarget,rect=track.getBoundingClientRect();
  const minute=(rect.right-event.clientX)/rect.width*1440;
  v78OpenAtMinute(minute);
}
function v78VerticalClick(event){
  if(event.target.closest('.v78TimeboxEvent'))return;
  const canvas=event.currentTarget,rect=canvas.getBoundingClientRect();
  const minute=(event.clientY-rect.top)/rect.height*1440;
  v78OpenAtMinute(minute);
}
function v78Daily(){
  const plan=S.daily[sel]||{},tasks=dayTasks(sel),m=met(tasks),remaining=m.tot?Math.round(m.todo/m.tot*100):0,overdue=m.tot?Math.round(m.l/m.tot*100):0;
  const important=plan.mostImportant||plan.top3?.[0]||'';
  document.getElementById('app').innerHTML=`<section class="card"><div class="toolbar"><label>انتخاب روز<input id="dayInp" value="${sel}"></label><button id="goDay" class="primary">نمایش</button><button onclick="sel='${todayJ()}';render()">امروز</button><button onclick="sel=addDays(sel,-1);render()">روز قبل</button><button onclick="sel=addDays(sel,1);render()">روز بعد</button></div><h3>${showDate(sel)}</h3><div class="grid dash"><div class="c3">${kpi('تحقق روز',m.comp+'٪',`${m.d} از ${m.tot} انجام‌شده`,m.comp)}</div><div class="c3">${kpi('باقی‌مانده',m.todo,'فعالیت فعال',remaining)}</div><div class="c3">${kpi('میانگین پیشرفت',m.avg+'٪','بر اساس درصد پیشرفت کارها',m.avg)}</div><div class="c3">${kpi('عقب‌افتاده',m.l,'مورد نیازمند پیگیری',overdue)}</div></div></section><section class="card">${rowTitle('تمرکز اصلی روز و مهم‌ترین کار امروز','<button id="saveDay" class="primary">ذخیره تمرکز</button>')}<div class="two"><label>تمرکز اصلی روز<textarea id="focus" placeholder="موضوع اصلی که امروز باید روی آن متمرکز بمانی">${esc(plan.focus||'')}</textarea></label><label>مهم‌ترین کار امروز<textarea id="mostImportant" placeholder="کاری که حتی اگر هیچ کار دیگری انجام نشد، باید تمام شود">${esc(important)}</textarea></label></div></section>${v78Timeboxing(sel,tasks)}<section class="card">${rowTitle('لیست فعالیت‌های روز',`<button class="primary" onclick="openDlg(null,'${sel}')">+ افزودن فعالیت</button>`)}${taskList(tasks)}</section>`;
  document.getElementById('goDay').onclick=()=>{const value=jDate(document.getElementById('dayInp').value);if(!value)return alert('تاریخ شمسی معتبر وارد کنید.');sel=value;mon=value.slice(0,7);wstart=week(value).start;render()};
  document.getElementById('saveDay').onclick=()=>{const old=S.daily[sel]||{},oldTop=Array.isArray(old.top3)?old.top3:['','',''],main=document.getElementById('mostImportant').value.trim();S.daily[sel]={...old,focus:document.getElementById('focus').value.trim(),mostImportant:main,top3:[main,oldTop[1]||'',oldTop[2]||'']};save();render()};
}

daily=v78Daily;window.daily=daily;
window.v78SetTimeMode=v78SetTimeMode;
window.v78HorizontalClick=v78HorizontalClick;
window.v78VerticalClick=v78VerticalClick;
window.v78OpenAtMinute=v78OpenAtMinute;

function v78Rename(){
  document.title='Planner Life for Soil 7.8';
  const label=document.getElementById('calendarLabel');
  if(label)label.textContent='Planner Life for Soil 7.8 · تایم‌باکسینگ افقی و عمودی';
}
const v78RenderBase=render;
render=function(){
  const out=v78RenderBase();
  v78Rename();
  return out;
};
window.render=render;

function v78Init(){
  v78EnsureState();
  v78Rename();
  render();
}
v78Init();
