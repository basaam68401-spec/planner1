# planner-telegram Edge Function

این تابع پیام‌های Planner Life OS را بدون قرار دادن توکن ربات در GitHub یا مرورگر به تلگرام ارسال می‌کند.

## استقرار با Supabase CLI

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
supabase functions deploy planner-telegram
```

پس از استقرار، در پلنر وارد حساب ابری شوید، Chat ID را در «اعلان و اتوماسیون» ثبت کنید و «ارسال پیام آزمایشی» را بزنید.

تابع فقط درخواست کاربر واردشده در Supabase را می‌پذیرد. توکن ربات فقط در Secrets پروژه Supabase نگهداری می‌شود.
