// Exercises actual handlers with outbound networking DENIED. No provider calls.
type Handler = (request: Request) => Response | Promise<Response>;
Deno.test(
  'intake and notification handlers stay disabled even when environment flags request delivery',
  async () => {
    const variables: Record<string, string> = {
      INTAKE_ENABLED: 'true',
      INTAKE_ALLOWED_ORIGINS: 'https://forum.example.test',
      SUPABASE_URL: 'https://dedicated.example.test',
      SUPABASE_SERVICE_ROLE_KEY: 'test-only-key',
      TURNSTILE_SECRET_KEY: 'test-only-secret',
      INTAKE_RATE_PEPPER: 'test-only-pepper',
      NOTIFICATION_ENABLED: 'true',
      NOTIFICATION_PROVIDER: 'resend',
    };
    const previous = new Map(
      Object.keys(variables).map((key) => [key, Deno.env.get(key)]),
    );
    const originalServe = Deno.serve;
    let captured: Handler | undefined;
    Deno.serve = ((handler: Handler) => {
      captured = handler;
      return {};
    }) as unknown as typeof Deno.serve;
    try {
      Object.entries(variables).forEach(([key, value]) =>
        Deno.env.set(key, value),
      );
      await import('../public-submission/index.ts');
      if (!captured) throw Error('Intake handler was not registered');
      const intake = await captured(
        new Request('https://dedicated.example.test/intake', {
          method: 'POST',
          headers: { origin: variables.INTAKE_ALLOWED_ORIGINS },
        }),
      );
      if (intake.status !== 503 || (await intake.json()).accepted === true)
        throw Error('Intake must stay disabled');
      await import('../submission-notifications/index.ts');
      const notification = await captured(
        new Request('https://dedicated.example.test/worker', {
          method: 'POST',
        }),
      );
      if (notification.status !== 503)
        throw Error('Notifications must stay disabled');
    } finally {
      Deno.serve = originalServe;
      previous.forEach((value, key) =>
        value === undefined ? Deno.env.delete(key) : Deno.env.set(key, value),
      );
    }
  },
);
