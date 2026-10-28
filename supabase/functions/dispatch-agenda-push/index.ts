import { createClient } from 'npm:@supabase/supabase-js@2.89.0';
import webPush from 'npm:web-push@3.6.7';

// Called by an authenticated scheduler. It never accepts client-provided endpoints,
// messages, or recipients; the database outbox contains trusted event recipients.
Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const cronSecret = Deno.env.get('AGENDA_PUSH_CRON_SECRET');
  if (!cronSecret || request.headers.get('x-agenda-cron-secret') !== cronSecret) return new Response('Unauthorized', { status: 401 });
  const publicKey = Deno.env.get('AGENDA_VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('AGENDA_VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('AGENDA_VAPID_SUBJECT');
  const appUrl = Deno.env.get('AGENDA_PUBLIC_APP_URL');
  if (!publicKey || !privateKey || !subject || !appUrl) return Response.json({ error: 'Push delivery configuration missing' }, { status: 503 });
  webPush.setVapidDetails(subject, publicKey, privateKey);
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { error: reminderError } = await client.rpc('enqueue_agenda_reminders');
  if (reminderError) return Response.json({ error: 'Could not enqueue reminders' }, { status: 500 });
  const { data, error } = await client.rpc('claim_agenda_push_batch', { p_limit: 50 });
  if (error) return Response.json({ error: 'Could not claim push deliveries' }, { status: 500 });
  let sent = 0; let failed = 0; let acknowledgementFailed = false;
  const deliveries = data || [];
  // Bound wall time and resource use: at most ten outbound requests in flight.
  for (let offset = 0; offset < deliveries.length; offset += 10) {
    await Promise.all(deliveries.slice(offset, offset + 10).map(async (delivery: {
      delivery_id: string; subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
      title: string; body: string; tag: string; store_slug: string | null; destination: string;
    }) => {
    let status = 500; let message: string | null = null;
    try {
      const base = new URL(appUrl.endsWith('/') ? appUrl : `${appUrl}/`);
      const path = delivery.destination === 'meus-agendamentos' && delivery.store_slug
        ? `${encodeURIComponent(delivery.store_slug)}/meus-agendamentos`
        : `${delivery.destination || ''}${delivery.store_slug ? `?empresa=${encodeURIComponent(delivery.store_slug)}` : ''}`;
      const target = new URL(path, base);
      const result = await webPush.sendNotification(delivery.subscription, JSON.stringify({
        title: delivery.title, body: delivery.body, tag: delivery.tag,
        url: target.href, icon: new URL('icons/icon-192.png', base).href,
      }), { TTL: 3600, urgency: 'normal', timeout: 10000 });
      status = result.statusCode; sent++;
    } catch (error) {
      const failure = error as { statusCode?: number; message?: string };
      status = failure.statusCode || 500;
      message = failure.message || 'Push delivery failed'; failed++;
    }
    const { error: finishError } = await client.rpc('finish_agenda_push', { p_delivery_id: delivery.delivery_id, p_status: status, p_error: message });
    if (finishError) acknowledgementFailed = true;
    }));
  }
  if (acknowledgementFailed) return Response.json({ error: 'Could not acknowledge push delivery', sent, failed }, { status: 500 });
  return Response.json({ sent, failed });
});
