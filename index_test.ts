import {dueEvents} from './schedule.ts';

Deno.test('scheduled reminder is sent from server time in Tehran',()=>{
  const state={tasks:[{id:'a',title:'پیگیری',jDate:'1405-08-16',start:'09:10',reminder:'5',status:'انجام‌نشده'}],settingsV7:{notificationV75:{pushDailyDigest:false}}};
  const rows=dueEvents(state,new Date('2026-11-07T05:35:00Z'));
  if(rows.length!==1||rows[0].key!=='task:a:1405-08-16:09:10:5')throw new Error(JSON.stringify(rows));
});

Deno.test('reminder before local midnight reaches next-day task',()=>{
  const state={tasks:[{id:'b',title:'کار فردا',jDate:'1405-08-17',start:'00:00',reminder:'30',status:'انجام‌نشده'}],settingsV7:{notificationV75:{pushDailyDigest:false}}};
  const rows=dueEvents(state,new Date('2026-11-07T20:00:00Z'));
  if(rows.length!==1||rows[0].key!=='task:b:1405-08-17:00:00:30')throw new Error(JSON.stringify(rows));
});

Deno.test('completed tasks do not produce push events',()=>{
  const state={tasks:[{id:'c',title:'انجام شد',jDate:'1405-08-16',start:'09:10',reminder:'5',status:'انجام‌شده'}],settingsV7:{notificationV75:{pushDailyDigest:false}}};
  if(dueEvents(state,new Date('2026-11-07T05:35:00Z')).length)throw new Error('completed task was scheduled');
});
