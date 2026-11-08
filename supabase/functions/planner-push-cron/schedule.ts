// Pure schedule calculation. Safe to test without network or VAPID secrets.
const TZ='Asia/Tehran';
const fmt=new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
type Slot={date:string;time:string};
function slot(at:Date):Slot{const p=Object.fromEntries(fmt.formatToParts(at).map(x=>[x.type,x.value]));return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`}}
export function dueEvents(state:any,now:Date){
  const tasks=Array.isArray(state?.tasks)?state.tasks:[];
  const settings=state?.settingsV7?.notificationV75||{};
  const out=new Map<string,{key:string;title:string;body:string}>();
  for(let offset=0;offset<=10;offset++){
    const candidate=new Date(now.getTime()-offset*60000),current=slot(candidate);
    if(settings.pushDailyDigest!==false&&current.time===(settings.dailyDigestTime||'08:00')){
      const today=tasks.filter((t:any)=>t.jDate===current.date&&t.status!=='انجام‌شده'&&t.status!=='لغو شده');
      const titles=today.slice(0,3).map((t:any)=>String(t.title||'کار').slice(0,90)).join('، ');
      const key=`digest:${current.date}`;
      out.set(key,{key,title:'برنامه امروز',body:titles||'امروز کار زمان‌بندی‌شده‌ای ثبت نشده است.'});
    }
    for(const task of tasks){
      if(!task?.id||!task?.start||!['0','5','15','30','60'].includes(String(task.reminder)))continue;
      if(['انجام‌شده','لغو شده'].includes(task.status))continue;
      const scheduled=slot(new Date(candidate.getTime()+Number(task.reminder)*60000));
      if(task.jDate!==scheduled.date||task.start!==scheduled.time)continue;
      const key=`task:${task.id}:${task.jDate}:${task.start}:${task.reminder}`;
      out.set(key,{key,title:'یادآور کار',body:`${String(task.title||'کار').slice(0,130)} — ساعت ${task.start}`});
    }
  }
  return [...out.values()].slice(0,25);
}
