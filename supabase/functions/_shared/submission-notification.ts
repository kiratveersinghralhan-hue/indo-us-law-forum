export type NotificationConfig = {
  enabled: boolean;
  provider: string;
  recipient: string;
  sender: string;
  apiKey: string;
  adminOrigin: string;
};
export type NotificationResult =
  | { status: 'disabled' }
  | { status: 'sent'; providerReference: string }
  | {
      status: 'failed';
      code:
        | 'transport'
        | 'provider_temporary'
        | 'provider_rejected'
        | 'invalid_response';
      retryable: boolean;
    };

export function notificationConfigured(config: NotificationConfig): boolean {
  if (!config.enabled || config.provider !== 'resend') return false;
  const email = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
  if (!email.test(config.recipient) || !email.test(config.sender)) return false;
  if (
    [config.recipient, config.sender, config.apiKey, config.adminOrigin].some(
      (v) => !v || /PLACEHOLDER|YOUR_|\.invalid/i.test(v),
    )
  )
    return false;
  try {
    const url = new URL(config.adminOrigin);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

// Optional adapter, NOT a selected/purchased provider. Transport is injectable for tests.
// No contributor names, email, article text, filenames, attachments or signed URLs.
export async function sendSubmissionNotification(
  reference: string,
  config: NotificationConfig,
  transport: typeof fetch = fetch,
): Promise<NotificationResult> {
  if (!notificationConfigured(config)) return { status: 'disabled' };
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(reference))
    return { status: 'failed', code: 'invalid_response', retryable: false };
  try {
    const response = await transport('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `submission/${reference}`,
      },
      body: JSON.stringify({
        from: config.sender,
        to: [config.recipient],
        subject: 'Indo-US Law Forum — submission received',
        text: `A submission awaits private editorial review.\nReference: ${reference}\nSign in to the authorized editorial workspace: ${new URL('/admin/submissions', config.adminOrigin).href}\nThis notification does not approve or publish the submission.`,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok)
      return {
        status: 'failed',
        code:
          response.status === 429 || response.status >= 500
            ? 'provider_temporary'
            : 'provider_rejected',
        retryable: response.status === 429 || response.status >= 500,
      };
    const data = await response.json();
    if (typeof data.id !== 'string' || !data.id || data.id.length > 100)
      return { status: 'failed', code: 'invalid_response', retryable: true };
    return { status: 'sent', providerReference: data.id };
  } catch {
    return { status: 'failed', code: 'transport', retryable: true };
  }
}
