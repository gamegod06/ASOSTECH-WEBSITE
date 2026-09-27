import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type LeadRecord = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  service_required: string;
  project_type: string | null;
  project_details: string;
  source: 'website' | 'quote';
  created_at: string;
};

type DatabaseWebhook = {
  type: string;
  schema: string;
  table: string;
  record: LeadRecord | null;
};

function equalSecret(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const expectedSecret = Deno.env.get('NOTIFICATION_WEBHOOK_SECRET') ?? '';
  const suppliedSecret = request.headers.get('x-webhook-secret') ?? '';
  if (!expectedSecret || !equalSecret(expectedSecret, suppliedSecret)) return new Response('Unauthorized', { status: 401 });

  let payload: DatabaseWebhook;
  try { payload = await request.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }
  if (payload.type !== 'INSERT' || payload.schema !== 'public' || payload.table !== 'leads' || !payload.record) {
    return new Response('Unsupported webhook event', { status: 400 });
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM_EMAIL');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!resendKey || !from || !supabaseUrl) return new Response('Email notification settings are incomplete', { status: 500 });

  let secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secretKey) {
    try {
      const configured = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, unknown>;
      secretKey = Object.values(configured).find((value): value is string => typeof value === 'string' && value.startsWith('sb_secret_'));
    } catch { /* Use the legacy service role key when available. */ }
  }
  if (!secretKey) return new Response('Supabase admin key is unavailable to this function', { status: 500 });

  const supabase = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const [adminResult, settingsResult] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabase.from('site_settings').select('notifications').eq('id', true).maybeSingle(),
  ]);
  if (adminResult.error) return new Response('Could not look up ASOSTECH administrators', { status: 500 });
  if (settingsResult.error) return new Response('Could not load notification preferences', { status: 500 });

  const lead = payload.record;
  const preferences = settingsResult.data?.notifications ?? {};
  const preferenceName = lead.source === 'quote' ? 'New quote' : 'New message';
  if (preferences[preferenceName] === false || preferences['New lead'] === false) {
    return Response.json({ sent: false, reason: 'Email notifications are disabled in admin settings.' });
  }

  const recipients = adminResult.data.users
    .filter((user) => user.app_metadata?.role === 'admin' && user.email)
    .map((user) => user.email as string);
  if (recipients.length === 0) return Response.json({ sent: false, reason: 'No admin accounts with email addresses were found.' });

  const name = escapeHtml(lead.name);
  const email = escapeHtml(lead.email);
  const service = escapeHtml(lead.service_required);
  const projectType = escapeHtml(lead.project_type ?? 'Not specified');
  const details = escapeHtml(lead.project_details).replace(/\r?\n/g, '<br/>');
  const phone = escapeHtml(lead.phone ?? 'Not provided');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `asostech-lead-${lead.id}` },
    body: JSON.stringify({
      from,
      to: recipients,
      reply_to: lead.email,
      subject: `New ASOSTECH ${lead.source === 'quote' ? 'quote request' : 'website enquiry'} from ${lead.name}`,
      text: `New ${lead.source === 'quote' ? 'quote request' : 'website enquiry'}\nName: ${lead.name}\nEmail: ${lead.email}\nPhone: ${lead.phone ?? 'Not provided'}\nService: ${lead.service_required}\nProject: ${lead.project_type ?? 'Not specified'}\n\n${lead.project_details}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#14251d"><div style="background:#0b2318;padding:22px 26px;color:#fff"><strong style="color:#25e77d">ASOSTECH</strong><div style="margin-top:8px;font-size:20px">New ${lead.source === 'quote' ? 'quote request' : 'website enquiry'}</div></div><div style="padding:24px;border:1px solid #e3ebe6"><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p><p><strong>Phone:</strong> ${phone}</p><p><strong>Service:</strong> ${service}</p><p><strong>Project type:</strong> ${projectType}</p><div style="margin-top:20px;padding:16px;background:#f4f8f5;line-height:1.6"><strong>Project details</strong><p>${details}</p></div><p style="margin-top:22px"><a href="mailto:${email}?subject=ASOSTECH%20enquiry" style="background:#18c96e;color:#04150b;text-decoration:none;padding:11px 16px;font-weight:bold">Reply to ${name}</a></p></div></div>`,
    }),
  });
  if (!response.ok) return new Response('Email provider rejected the notification', { status: 502 });
  return Response.json({ sent: true, recipientCount: recipients.length });
});
