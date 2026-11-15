import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { notificationPolicyReady } from '../_shared/submission-policy.ts';
import {
  notificationConfigured,
  sendSubmissionNotification,
} from '../_shared/submission-notification.ts';

// Unscheduled, disabled server worker. No browser CORS or contributor-triggered email.
Deno.serve(async (request: Request) => {
  const respond = (status: number, body: object) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  if (request.method !== 'POST')
    return respond(405, { error: 'Method unavailable.' });
  if (!notificationPolicyReady)
    return respond(503, { error: 'Notification delivery is disabled.' });
  const workerToken = Deno.env.get('NOTIFICATION_WORKER_TOKEN') ?? '';
  const supplied =
    request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  // Hash before comparison so unequal secret lengths do not short-circuit comparison.
  const hash = (value: string) =>
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const [a, b] = await Promise.all([hash(workerToken), hash(supplied)]);
  let difference = 0;
  new Uint8Array(a).forEach((value, i) => {
    difference |= value ^ new Uint8Array(b)[i];
  });
  if (
    workerToken.length < 32 ||
    /PLACEHOLDER|YOUR_/i.test(workerToken) ||
    difference !== 0
  )
    return respond(401, { error: 'Not permitted.' });
  const config = {
    enabled: Deno.env.get('NOTIFICATION_ENABLED') === 'true',
    provider: Deno.env.get('NOTIFICATION_PROVIDER') ?? 'disabled',
    recipient: Deno.env.get('NOTIFICATION_RECIPIENT') ?? '',
    sender: Deno.env.get('NOTIFICATION_SENDER') ?? '',
    apiKey: Deno.env.get('NOTIFICATION_API_KEY') ?? '',
    adminOrigin: Deno.env.get('NOTIFICATION_ADMIN_ORIGIN') ?? '',
  };
  const url = Deno.env.get('SUPABASE_URL'),
    key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key || !notificationConfigured(config))
    return respond(503, { error: 'Notification configuration unavailable.' });
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const claim = await db.rpc('claim_submission_notification');
    if (claim.error) throw Error();
    if (!claim.data) return respond(200, { processed: false });
    const result = await sendSubmissionNotification(
      claim.data.reference,
      config,
    );
    if (result.status === 'disabled') throw Error();
    const finish = await db.rpc('finish_submission_notification', {
      reference: claim.data.reference,
      lease: claim.data.lease,
      succeeded: result.status === 'sent',
      provider_reference:
        result.status === 'sent' ? result.providerReference : null,
      error_code: result.status === 'failed' ? result.code : null,
      retryable: result.status === 'failed' && result.retryable,
    });
    if (finish.error) throw Error();
    return respond(200, { processed: true, status: result.status });
  } catch {
    // No secret/provider response/contributor data in logs or HTTP errors.
    // Unfinished leases expire; retries reuse the same provider idempotency key.
    return respond(503, {
      error:
        'Notification processing unavailable; accepted submissions remain saved.',
    });
  }
});
