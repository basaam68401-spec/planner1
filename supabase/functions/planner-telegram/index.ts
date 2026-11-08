import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ ok: false, error: 'فقط درخواست POST مجاز است.' }, 405);
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')?.trim();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim();

    if (!botToken || !supabaseUrl || !supabaseAnonKey) {
      return json({
        ok: false,
        error: 'تنظیمات سرور کامل نیست. Secret تلگرام یا متغیرهای Supabase در دسترس نیست.',
      }, 500);
    }

    const authorization = req.headers.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    const accessToken = match?.[1]?.trim();

    if (!accessToken) {
      return json({ ok: false, error: 'توکن ورود کاربر ارسال نشده است.' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !data?.user) {
      return json({
        ok: false,
        error: 'نشست کاربری معتبر نیست. از حساب ابری خارج و دوباره وارد شوید.',
        detail: authError?.message || null,
      }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const chatId = String(body?.chatId || '').trim();
    const text = String(body?.text || '').trim();
    const kind = String(body?.kind || 'manual').slice(0, 40);

    if (!/^-?\d{5,20}$/.test(chatId)) {
      return json({ ok: false, error: 'Chat ID معتبر نیست.' }, 400);
    }

    if (!text) {
      return json({ ok: false, error: 'متن پیام خالی است.' }, 400);
    }

    if (text.length > 4000) {
      return json({ ok: false, error: 'متن پیام بیش از حد طولانی است.' }, 400);
    }

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
        }),
      },
    );

    const telegramResult = await telegramResponse.json().catch(() => ({}));

    if (!telegramResponse.ok || telegramResult?.ok === false) {
      return json({
        ok: false,
        error: telegramResult?.description || 'ارسال پیام تلگرام ناموفق بود.',
        telegramStatus: telegramResponse.status,
      }, 502);
    }

    return json({
      ok: true,
      kind,
      userId: data.user.id,
      messageId: telegramResult?.result?.message_id || null,
    });
  } catch (error) {
    return json({
      ok: false,
      error: String((error as Error)?.message || error),
    }, 500);
  }
});
