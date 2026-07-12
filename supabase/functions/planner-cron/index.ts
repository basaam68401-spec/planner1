import { createClient } from 'npm:@supabase/supabase-js@2';

const TIME_ZONE = 'Asia/Tehran';
const MAX_MESSAGES_PER_USER = 10;

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value: unknown, min = 0, max = 100) {
  return Math.max(min, Math.min(max, num(value)));
}

function fa(value: unknown) {
  return String(value ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

function money(value: unknown) {
  const n = Math.round(num(value));
  const sign = n < 0 ? '− ' : '';
  return `${sign}${fa(Math.abs(n).toLocaleString('en-US'))} تومان`;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function div(a: number, b: number) {
  return Math.trunc(a / b);
}

function jalCal(jy: number) {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jm = 0;
  let jump = 0;
  let leap = 0;
  let n = 0;
  for (let i = 1; i < breaks.length; i++) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(jump % 33, 4);
    jp = jm;
  }
  n = jy - jp;
  leapJ += div(n, 33) * 8 + div((n % 33) + 3, 4);
  if (jump % 33 === 4 && jump - n === 4) leapJ++;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  leap = (((n + 1) % 33) - 1) % 4;
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * ((gm + 9) % 12) + 2, 5) + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j += div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(j % 1461, 4) * 5 + 308;
  const gd = div(i % 153, 5) + 1;
  const gm = (div(i, 153) % 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  let jm = 0;
  let jd = 0;
  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = (k % 31) + 1;
      return { jy, jm, jd };
    }
    k -= 186;
  } else {
    jy--;
    k += 179;
    if (jalCal(jy).leap === 1) k++;
  }
  jm = 7 + div(k, 30);
  jd = (k % 30) + 1;
  return { jy, jm, jd };
}

function parseJalali(value: string) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { jy: Number(match[1]), jm: Number(match[2]), jd: Number(match[3]) };
}

function addDays(jalali: string, days: number) {
  const p = parseJalali(jalali);
  if (!p) return jalali;
  const next = d2j(j2d(p.jy, p.jm, p.jd) + days);
  return `${next.jy}-${pad(next.jm)}-${pad(next.jd)}`;
}

function jDateDiff(from: string, to: string) {
  const a = parseJalali(from);
  const b = parseJalali(to);
  if (!a || !b) return 0;
  return j2d(b.jy, b.jm, b.jd) - j2d(a.jy, a.jm, a.jd);
}

function tehranNow(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'long',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  return {
    jDate: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function isoToJalali(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return tehranNow(date).jDate;
}

function timeToMinutes(value: string, fallback = 0) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  return Math.max(0, Math.min(1439, Number(match[1]) * 60 + Number(match[2])));
}

function isQuiet(nowMinutes: number, from: string, to: string) {
  const a = timeToMinutes(from, 22 * 60 + 30);
  const b = timeToMinutes(to, 7 * 60);
  if (a === b) return false;
  return a < b ? nowMinutes >= a && nowMinutes < b : nowMinutes >= a || nowMinutes < b;
}

function done(task: any) {
  return task?.status === 'انجام‌شده';
}

function cancelled(task: any) {
  return task?.status === 'لغو شده';
}

function goalProgress(goal: any, state: any) {
  if (goal?.status === 'completed') return 100;
  const parts: Array<{ value: number; weight: number }> = [];
  const steps = Array.isArray(goal?.steps) ? goal.steps.filter((step: any) => String(step?.title || '').trim()) : [];
  if (steps.length) parts.push({ value: Math.round((steps.filter((step: any) => step.done).length / steps.length) * 100), weight: 45 });
  const projects = (state?.projects || []).filter((project: any) => project.goalId === goal.id && project.status !== 'cancelled');
  if (projects.length) parts.push({ value: average(projects.map((project: any) => projectProgress(project, state))), weight: 35 });
  const directTasks = (state?.tasks || []).filter((task: any) => task.goalId === goal.id && !task.projectId && !cancelled(task));
  if (directTasks.length) {
    const score = Math.round(directTasks.reduce((sum: number, task: any) => sum + (done(task) ? 100 : clamp(task.progress || 0)), 0) / directTasks.length);
    parts.push({ value: score, weight: 20 });
  }
  if (!parts.length) return clamp(goal?.manualProgress || 0);
  const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0) || 1;
  return Math.round(parts.reduce((sum, part) => sum + part.value * part.weight, 0) / totalWeight);
}

function projectProgress(project: any, state: any) {
  if (project?.status === 'completed') return 100;
  const tasks = (state?.tasks || []).filter((task: any) => task.projectId === project.id && !cancelled(task));
  const taskProgress = tasks.length ? Math.round((tasks.filter(done).length / tasks.length) * 100) : null;
  const manual = clamp(project?.manualProgress || 0);
  if (project?.progressMode === 'tasks') return taskProgress == null ? 0 : taskProgress;
  if (project?.progressMode === 'manual') return manual;
  return taskProgress == null ? manual : Math.round((taskProgress + manual) / 2);
}

function systemAdherence(system: any, state: any, now: Date) {
  const since = now.getTime() - 30 * 86400000;
  const runs = (state?.systemRuns || []).filter((run: any) => run.systemId === system.id);
  const completed = runs.filter((run: any) => run.status === 'completed' && Date.parse(run.completedAt || run.updatedAt || '') >= since).length;
  if (system?.frequency === 'manual' || system?.frequency === 'trigger') {
    const recent = runs.filter((run: any) => Date.parse(run.startedAt || run.createdAt || '') >= since);
    return recent.length ? Math.round((recent.filter((run: any) => run.status === 'completed').length / recent.length) * 100) : 0;
  }
  let expected = 1;
  if (system?.frequency === 'daily') expected = 30;
  if (system?.frequency === 'weekly') expected = Math.max(1, num(system?.frequencyCount, 1)) * 4;
  if (system?.frequency === 'monthly') expected = 1;
  return Math.min(100, Math.round((completed / expected) * 100));
}

function average(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value));
  return clean.length ? Math.round(clean.reduce((sum, value) => sum + value, 0) / clean.length) : 0;
}

function levelUpScore(state: any, now: Date) {
  const areas = (state?.areas || []).filter((area: any) => area.active !== false);
  if (!areas.length) return 0;
  function areaScore(area: any) {
    const goals = (state?.goalsV7 || []).filter((goal: any) => goal.areaId === area.id && !['archived', 'someday'].includes(goal.status));
    const systems = (state?.systems || []).filter((system: any) => system.areaId === area.id && system.active !== false);
    const projects = (state?.projects || []).filter((project: any) => project.areaId === area.id && project.status !== 'cancelled');
    const goalIds = new Set(goals.map((goal: any) => goal.id));
    const projectIds = new Set(projects.map((project: any) => project.id));
    const systemIds = new Set(systems.map((system: any) => system.id));
    const since = addDays(tehranNow(now).jDate, -89);
    const tasks = (state?.tasks || []).filter((task: any) => task.jDate >= since && task.jDate <= tehranNow(now).jDate && !cancelled(task) && (goalIds.has(task.goalId) || projectIds.has(task.projectId) || systemIds.has(task.systemId)));
    const taskScore = tasks.length ? Math.round(tasks.reduce((sum: number, task: any) => sum + (done(task) ? 100 : clamp(task.progress || 0)), 0) / tasks.length) : null;
    const parts = [
      { value: goals.length ? average(goals.map((goal: any) => goalProgress(goal, state))) : null, weight: 35 },
      { value: projects.length ? average(projects.map((project: any) => projectProgress(project, state))) : null, weight: 30 },
      { value: systems.length ? average(systems.map((system: any) => systemAdherence(system, state, now))) : null, weight: 20 },
      { value: taskScore, weight: 15 },
    ];
    const valid = parts.filter((part) => part.value != null && Number.isFinite(Number(part.value)));
    if (!valid.length) return 0;
    const weights = valid.reduce((sum, part) => sum + part.weight, 0) || 1;
    return Math.round(valid.reduce((sum, part) => sum + Number(part.value) * part.weight, 0) / weights);
  }
  const totalWeight = areas.reduce((sum: number, area: any) => sum + Math.max(0, num(area.weight)), 0) || 1;
  return Math.round(areas.reduce((sum: number, area: any) => sum + areaScore(area) * Math.max(0, num(area.weight)), 0) / totalWeight);
}

function cashBalance(state: any) {
  const settings = state?.financeSettings || {};
  const opening = num(settings.openingBalance);
  const transactions = (state?.financeTransactions || [])
    .filter((transaction: any) => transaction.status === 'actual')
    .reduce((sum: number, transaction: any) => sum + (transaction.type === 'income' ? num(transaction.amount) : -num(transaction.amount)), 0);
  const allocations = (state?.financeAllocations || [])
    .filter((allocation: any) => allocation.status === 'actual')
    .reduce((sum: number, allocation: any) => sum + num(allocation.amount), 0);
  return opening + transactions - allocations;
}

function forecast30(state: any, today: string) {
  const end = addDays(today, 30);
  const includeProbable = state?.financeSettings?.includeProbableInForecast !== false;
  const transactions = (state?.financeTransactions || []).filter((transaction: any) =>
    transaction.date >= today && transaction.date <= end && transaction.status !== 'actual' &&
    (transaction.status === 'planned' || (includeProbable && transaction.status === 'probable'))
  );
  const incomes = transactions.filter((transaction: any) => transaction.type === 'income').reduce((sum: number, transaction: any) => sum + num(transaction.amount), 0);
  const expenses = transactions.filter((transaction: any) => transaction.type === 'expense').reduce((sum: number, transaction: any) => sum + num(transaction.amount), 0);
  const installments = (state?.installments || []).filter((installment: any) => installment.status !== 'paid' && installment.dueDate >= today && installment.dueDate <= end).reduce((sum: number, installment: any) => sum + num(installment.amount), 0);
  const allocations = (state?.financeAllocations || []).filter((allocation: any) => allocation.status !== 'actual' && allocation.date >= today && allocation.date <= end).reduce((sum: number, allocation: any) => sum + num(allocation.amount), 0);
  return cashBalance(state) + incomes - expenses - installments - allocations;
}

function weeklyRange(today: string, weekday: string) {
  const order: Record<string, number> = { Saturday: 0, Sunday: 1, Monday: 2, Tuesday: 3, Wednesday: 4, Thursday: 5, Friday: 6 };
  const index = order[weekday] ?? 0;
  const start = addDays(today, -index);
  return { start, end: addDays(start, 6) };
}

function dailyDigest(state: any, today: string, now: Date) {
  const tasks = (state?.tasks || [])
    .filter((task: any) => task.jDate === today && !done(task) && !cancelled(task))
    .sort((a: any, b: any) => {
      const priority: Record<string, number> = { بالا: 3, متوسط: 2, پایین: 1 };
      return (priority[b.priority] || 0) - (priority[a.priority] || 0) || String(a.start || '99:99').localeCompare(String(b.start || '99:99'));
    });
  const dueSystems = (state?.systems || []).filter((system: any) => system.active !== false && system.nextRunDate && system.nextRunDate <= today).length;
  const overdueTasks = (state?.tasks || []).filter((task: any) => task.jDate < today && !done(task) && !cancelled(task)).length;
  const overdueProjects = (state?.projects || []).filter((project: any) => project.due && project.due < today && !['completed', 'cancelled'].includes(project.status)).length;
  const overdueInstallments = (state?.installments || []).filter((installment: any) => installment.status !== 'paid' && installment.dueDate < today).length;
  const critical = overdueTasks + overdueProjects + overdueInstallments;
  const top = tasks.slice(0, 3).map((task: any) => task.title).join('، ') || 'کار ثبت‌شده‌ای وجود ندارد';
  return [
    `📊 خلاصه امروز ${fa(today)}`,
    '',
    `کارهای فعال: ${fa(tasks.length)}`,
    `سیستم‌های موعددار: ${fa(dueSystems)}`,
    `هشدارهای نیازمند توجه: ${fa(critical)}`,
    `اولویت‌ها: ${top}`,
    `LEVEL UP: ${fa(levelUpScore(state, now))}٪`,
  ].join('\n');
}

function weeklyDigest(state: any, today: string, weekday: string, now: Date) {
  const range = weeklyRange(today, weekday);
  const tasks = (state?.tasks || []).filter((task: any) => task.jDate >= range.start && task.jDate <= range.end && !cancelled(task));
  const doneCount = tasks.filter(done).length;
  const lateCount = tasks.filter((task: any) => !done(task) && task.jDate < today).length;
  const completion = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const runs = (state?.systemRuns || []).filter((run: any) => {
    const date = isoToJalali(run.startedAt || run.createdAt || '');
    return date && date >= range.start && date <= range.end;
  });
  const focus = (state?.goalsV7 || []).filter((goal: any) => goal.status === 'focus90');
  const energyValues = Object.values(state?.dailyReviews || {})
    .filter((review: any) => review?.date >= range.start && review?.date <= range.end && num(review?.energy) > 0)
    .map((review: any) => num(review?.energy));
  const review = state?.weeklyReviews?.[range.start] || {};
  return [
    '📈 گزارش هفتگی Planner Life for Soil',
    `هفته ${fa(range.start)} تا ${fa(range.end)}`,
    '',
    `تحقق کارها: ${fa(completion)}٪`,
    `انجام‌شده: ${fa(doneCount)}`,
    `عقب‌افتاده: ${fa(lateCount)}`,
    `اجرای سیستم‌ها: ${fa(runs.filter((run: any) => run.status === 'completed').length)} از ${fa(runs.length)}`,
    `پیشرفت اهداف ۹۰روزه: ${fa(average(focus.map((goal: any) => goalProgress(goal, state))))}٪`,
    `انرژی میانگین: ${energyValues.length ? `${fa(average(energyValues))}/۵` : 'ثبت نشده'}`,
    `LEVEL UP: ${fa(levelUpScore(state, now))}٪`,
    review.wins ? `بردهای هفته: ${review.wins}` : '',
    review.keyDecision ? `تصمیم هفته آینده: ${review.keyDecision}` : '',
  ].filter(Boolean).join('\n');
}

function criticalEvents(state: any, today: string) {
  const events: Array<{ key: string; text: string }> = [];
  const tomorrow = addDays(today, 1);
  for (const installment of (state?.installments || []).filter((item: any) => item.status !== 'paid' && item.dueDate <= tomorrow)) {
    const loan = (state?.loans || []).find((item: any) => item.id === installment.loanId);
    const label = installment.dueDate < today ? 'قسط عقب‌افتاده' : installment.dueDate === today ? 'قسط امروز' : 'قسط فردا';
    events.push({
      key: `installment:${installment.id}:${installment.dueDate}`,
      text: `🔴 ${label}\n${loan?.title || loan?.lender || 'وام'} — ${money(installment.amount)}\nسررسید: ${fa(installment.dueDate)}`,
    });
  }
  for (const project of (state?.projects || []).filter((item: any) => item.due && item.due < today && !['completed', 'cancelled'].includes(item.status)).slice(0, 3)) {
    events.push({ key: `project:${project.id}:${today}`, text: `🔴 پروژه گذشته از مهلت\n${project.title}\nمهلت: ${fa(project.due)}` });
  }
  for (const task of (state?.tasks || []).filter((item: any) => item.priority === 'بالا' && item.jDate < today && !done(item) && !cancelled(item)).slice(0, 3)) {
    events.push({ key: `task:${task.id}:${today}`, text: `🔴 کار مهم عقب‌افتاده\n${task.title}\nتاریخ: ${fa(task.jDate)}` });
  }
  for (const goal of (state?.goalsV7 || []).filter((item: any) => ['active', 'focus90'].includes(item.status) && item.due && goalProgress(item, state) < 100 && jDateDiff(today, item.due) >= 0 && jDateDiff(today, item.due) <= 3).slice(0, 3)) {
    events.push({ key: `goal:${goal.id}:${today}`, text: `🟡 هدف نزدیک به مهلت\n${goal.title}\n${fa(jDateDiff(today, goal.due))} روز مانده — پیشرفت ${fa(goalProgress(goal, state))}٪` });
  }
  for (const system of (state?.systems || []).filter((item: any) => item.active !== false && item.nextRunDate && item.nextRunDate <= today).slice(0, 3)) {
    const active = (state?.systemRuns || []).some((run: any) => run.systemId === system.id && run.status === 'active');
    if (!active) events.push({ key: `system:${system.id}:${today}`, text: `🟡 سیستم موعد اجرا دارد\n${system.name}` });
  }
  return events.slice(0, MAX_MESSAGES_PER_USER);
}

async function telegramSend(botToken: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.ok === false) throw new Error(body?.description || `Telegram HTTP ${res.status}`);
  return body?.result?.message_id || null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return response({ ok: false, error: 'Only POST is allowed.' }, 405);
  const expectedSecret = Deno.env.get('PLANNER_CRON_SECRET')?.trim();
  const suppliedSecret = req.headers.get('x-cron-secret')?.trim();
  if (!expectedSecret || !suppliedSecret || suppliedSecret !== expectedSecret) {
    return response({ ok: false, error: 'Unauthorized cron request.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')?.trim();
  if (!supabaseUrl || !serviceRole || !botToken) {
    return response({ ok: false, error: 'Missing server environment variables.' }, 500);
  }

  const requestBody = await req.json().catch(() => ({}));
  const mode = String(requestBody?.mode || 'run');

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const now = new Date();
  const tehran = tehranNow(now);
  const { data: rows, error: readError } = await supabase.from('planner_states').select('user_id,state');
  if (readError) return response({ ok: false, error: readError.message }, 500);

  const results: any[] = [];
  for (const row of rows || []) {
    const state = row.state || {};
    const settings = state?.settingsV7?.notificationV75 || {};
    const chatId = String(settings.telegramChatId || '').trim();
    if (!settings.telegramEnabled || !/^-?\d{5,20}$/.test(chatId)) continue;

    const sent: string[] = [];
    const skipped: string[] = [];
    const failed: string[] = [];

    async function claimAndSend(dedupeKey: string, kind: string, text: string) {
      const { error: claimError } = await supabase.from('planner_cron_deliveries').insert({
        user_id: row.user_id,
        dedupe_key: dedupeKey,
        kind,
        status: 'pending',
        detail: { jDate: tehran.jDate },
      });
      if (claimError) {
        if (claimError.code === '23505') {
          skipped.push(dedupeKey);
          return;
        }
        throw claimError;
      }
      try {
        const messageId = await telegramSend(botToken, chatId, text);
        await supabase.from('planner_cron_deliveries').update({ status: 'sent', sent_at: new Date().toISOString(), telegram_message_id: messageId }).eq('user_id', row.user_id).eq('dedupe_key', dedupeKey);
        sent.push(dedupeKey);
      } catch (error) {
        failed.push(`${dedupeKey}: ${String((error as Error)?.message || error)}`);
        await supabase.from('planner_cron_deliveries').delete().eq('user_id', row.user_id).eq('dedupe_key', dedupeKey);
      }
    }

    if (mode === 'test') {
      await claimAndSend(`cron-test:${now.toISOString().slice(0, 16)}`, 'test', `✅ ارسال خودکار Planner Cron فعال است.\nزمان تهران: ${fa(tehran.jDate)} — ${pad(tehran.hour)}:${pad(tehran.minute)}`);
      results.push({ userId: row.user_id, sent, skipped, failed });
      continue;
    }

    const quiet = isQuiet(tehran.minutes, settings.quietFrom || '22:30', settings.quietTo || '07:00');
    const dailyTime = timeToMinutes(settings.dailyDigestTime || '08:00', 8 * 60);
    if (settings.telegramDailyDigest && tehran.minutes >= dailyTime) {
      await claimAndSend(`daily:${tehran.jDate}`, 'daily', dailyDigest(state, tehran.jDate, now));
    }

    const weeklyTime = timeToMinutes(settings.weeklyReportTime || '18:00', 18 * 60);
    if (settings.telegramWeeklyReport && tehran.weekday === 'Friday' && tehran.minutes >= weeklyTime) {
      const range = weeklyRange(tehran.jDate, tehran.weekday);
      await claimAndSend(`weekly:${range.start}`, 'weekly', weeklyDigest(state, tehran.jDate, tehran.weekday, now));
    }

    if (settings.telegramCriticalAlerts && !quiet) {
      for (const event of criticalEvents(state, tehran.jDate)) {
        await claimAndSend(event.key, 'critical', event.text);
      }
    }

    results.push({ userId: row.user_id, sent, skipped, failed });
  }

  return response({ ok: true, checkedAt: now.toISOString(), tehran, users: results });
});
