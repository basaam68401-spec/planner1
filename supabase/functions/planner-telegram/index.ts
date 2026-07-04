import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const authorization = req.headers.get('Authorization') || '';

    if (!token || !supabaseUrl || !anonKey) {
      return json({ ok: false, error: 'تنظیمات سرور کامل نیست.' }, 500);
    }
    if (!authorization) {
      return json({ ok: false, error: 'ورود کاربر تأیید نشده است.' }, 401);
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return json({ ok: false, error: 'نشست کاربری معتبر نیست.' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const chatId = String(body.chatId || '').trim();
    const text = String(body.text || '').trim();
    const kind = String(body.kind || 'manual').slice(0, 40);

    if (!/^-?\d{5,20}$/.test(chatId)) {
      return json({ ok: false, error: 'Chat ID معتبر نیست.' }, 400);
    }
    if (!text) {
      return json({ ok: false, error: 'متن پیام خالی است.' }, 400);
    }
    if (text.length > 4000) {
      return json({ ok: false, error: 'متن پیام بیش از حد طولانی است.' }, 400);
    }

    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
    const result = await telegramResponse.json().catch(() => ({}));

    if (!telegramResponse.ok || result?.ok === false) {
      return json({ ok: false, error: result?.description || 'ارسال پیام تلگرام ناموفق بود.' }, 502);
    }

    return json({ ok: true, kind, messageId: result?.result?.message_id || null });
  } catch (error) {
    return json({ ok: false, error: String(error?.message || error) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}
