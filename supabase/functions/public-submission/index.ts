import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import {
  intakeLimit,
  validateAttachment,
  validateIntake,
} from '../_shared/intake-validation.ts';
import type { IntakeFields } from '../_shared/intake-validation.ts';
import { submissionPolicyReady } from '../_shared/submission-policy.ts';

// Intentionally no browser authorization: this endpoint has its own disabled gate,
// exact-origin allowlist, verified CAPTCHA, durable limits and payload validation.
// It must remain disabled until tested with the actual trusted gateway IP header.
Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin') ?? '';
  const origins = (Deno.env.get('INTAKE_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .filter(Boolean);
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origins.includes(origin) ? origin : 'null',
    Vary: 'Origin',
    'Access-Control-Allow-Headers':
      'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
  };
  const respond = (status: number, body: object) =>
    new Response(JSON.stringify(body), { status, headers });
  if (!origins.includes(origin)) {
    return respond(403, { error: 'Origin unavailable.' });
  }
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== 'POST') {
    return respond(405, { error: 'Method unavailable.' });
  }
  const url = Deno.env.get('SUPABASE_URL'),
    key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const captcha = Deno.env.get('TURNSTILE_SECRET_KEY'),
    pepper = Deno.env.get('INTAKE_RATE_PEPPER');
  if (
    !submissionPolicyReady ||
    !url ||
    !key ||
    !captcha ||
    !pepper ||
    Deno.env.get('INTAKE_ENABLED') !== 'true'
  )
    return respond(503, { error: 'Submissions are not accepting delivery.' });
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const gate = await db.rpc('intake_enabled');
  if (gate.error || gate.data !== true) {
    return respond(503, { error: 'Submissions are not accepting delivery.' });
  }
  let storedPath: string | null = null;
  let acceptanceAttempted = false;
  try {
    // Enforce the actual streamed body size even if Content-Length is missing/false.
    const reader = request.body?.getReader();
    if (!reader) return respond(400, { error: 'Missing payload.' });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > intakeLimit + 100000) {
        await reader.cancel();
        return respond(413, { error: 'Payload too large.' });
      }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const form = await new Request(request.url, {
      method: 'POST',
      headers: { 'content-type': request.headers.get('content-type') ?? '' },
      body: bytes,
    }).formData();
    const input = Object.fromEntries(
      [
        'requestId',
        'title',
        'excerpt',
        'author',
        'email',
        'categoryId',
        'outline',
        'token',
        'website',
        'elapsed',
      ].map((k) => [k, String(form.get(k) ?? '')]),
    ) as IntakeFields;
    const content = validateIntake(input);
    const file = form.get('attachment');
    let attachment: Uint8Array | null = null;
    if (file instanceof File && file.size) {
      attachment = new Uint8Array(await file.arrayBuffer());
      validateAttachment(attachment, file.type);
    }
    // Header provenance must be validated for the dedicated gateway before enabling.
    const ip = request.headers.get('cf-connecting-ip');
    if (!ip) return respond(503, { error: 'Abuse protection unavailable.' });
    const hmac = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(pepper),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    for (const identity of [
      `ip:${ip}`,
      `email:${input.email.trim().toLowerCase()}`,
    ]) {
      const signature = await crypto.subtle.sign(
        'HMAC',
        hmac,
        new TextEncoder().encode(identity),
      );
      const rateKey = Array.from(new Uint8Array(signature), (b) =>
        b.toString(16).padStart(2, '0'),
      ).join('');
      const limit = await db.rpc('consume_intake_limit', { rate_key: rateKey });
      if (limit.error || limit.data !== true) {
        return respond(429, { error: 'Please try again later.' });
      }
    }
    const verify = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: new URLSearchParams({
          secret: captcha,
          response: input.token,
          remoteip: ip,
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
    const proof = await verify.json();
    if (
      !verify.ok ||
      proof.success !== true ||
      proof.action !== 'article-submission' ||
      proof.hostname !== new URL(origin).hostname
    ) {
      return respond(400, {
        error: 'Verification failed. Please verify again.',
      });
    }
    const category = await db
      .from('categories')
      .select('id')
      .eq('id', input.categoryId)
      .eq('published', true)
      .maybeSingle();
    if (category.error || !category.data) {
      return respond(400, { error: 'Category unavailable.' });
    }
    const submissionId = crypto.randomUUID();
    if (attachment) {
      storedPath = `${submissionId}/${crypto.randomUUID()}.pdf`;
      const result = await db.storage
        .from('submission-attachments')
        .upload(storedPath, attachment, {
          contentType: 'application/pdf',
          upsert: false,
        });
      if (result.error) throw Error('Attachment could not be saved.');
    }
    const digest = async (value: Uint8Array) =>
      Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            'SHA-256',
            value as Uint8Array<ArrayBuffer>,
          ),
        ),
        (b) => b.toString(16).padStart(2, '0'),
      ).join('');
    const requestFingerprint = await digest(
      new TextEncoder().encode(
        JSON.stringify({
          category: input.categoryId,
          email: input.email.trim().toLowerCase(),
          content,
          document: attachment ? await digest(attachment) : null,
        }),
      ),
    );
    acceptanceAttempted = true;
    const result = await db.rpc('accept_submission_with_notification', {
      submission_id: submissionId,
      request_id: input.requestId,
      category_id: input.categoryId,
      email: input.email.trim().toLowerCase(),
      payload: content,
      attachment_path: storedPath,
      request_fingerprint: requestFingerprint,
    });
    if (result.error) {
      throw Error(
        'Acceptance could not be confirmed. Keep the same details when retrying; contact an editor if this persists.',
      );
    }
    if (result.data.duplicate && storedPath) {
      // This newly staged file was never referenced by the duplicate acceptance.
      // Cleanup failure must not turn a confirmed acceptance into a form error.
      try {
        await db.storage.from('submission-attachments').remove([storedPath]);
      } catch {
        /* trusted orphan cleanup remains pending */
      }
    }
    return respond(result.data.duplicate ? 200 : 201, {
      accepted: true,
      reference: result.data.reference,
    });
  } catch (error) {
    // A transport error can arrive after DB commit. Never delete a potentially
    // accepted original; reconcile unreferenced staging objects through trusted cleanup.
    if (storedPath && !acceptanceAttempted) {
      await db.storage.from('submission-attachments').remove([storedPath]);
    }
    // No contributor data, CAPTCHA tokens or credentials are logged.
    return respond(400, {
      error: error instanceof Error ? error.message : 'Submission unavailable.',
    });
  }
});
