-- تست دستی فراخوانی planner-cron از داخل Database
select net.http_post(
  url := 'https://esrqfulstdqnpbaldbko.supabase.co/functions/v1/planner-cron',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-cron-secret', (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'planner_cron_secret'
      limit 1
    )
  ),
  body := jsonb_build_object('source', 'manual-test', 'mode', 'test', 'requested_at', now()),
  timeout_milliseconds := 15000
) as request_id;

-- چند ثانیه بعد، پاسخ درخواست را بررسی کن:
select id, status_code, content, created
from net._http_response
order by created desc
limit 5;

-- تاریخچه اجرای Cron:
select jobid, runid, status, return_message, start_time, end_time
from cron.job_run_details
order by start_time desc
limit 20;

-- پیام‌های ارسال‌شده یا رزروشده:
select user_id, dedupe_key, kind, status, sent_at, created_at
from public.planner_cron_deliveries
order by created_at desc
limit 30;
