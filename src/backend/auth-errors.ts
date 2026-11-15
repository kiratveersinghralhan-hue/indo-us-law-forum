export function authFailure(error: unknown, recovery: boolean) {
  const source = (error ?? {}) as {
    status?: number;
    code?: string;
    message?: string;
  };
  const known = [
    'invalid_credentials',
    'email_not_confirmed',
    'over_request_rate_limit',
    'over_email_send_rate_limit',
    'weak_password',
    'same_password',
    'otp_expired',
    'flow_state_expired',
    'bad_code_verifier',
    'validation_failed',
  ];
  const code = known.includes(source.code ?? '') ? source.code : 'unclassified';
  const status = Number(source.status) || 0;
  console.warn('[staff-auth]', {
    code,
    status: status >= 100 && status <= 599 ? status : 0,
  });
  const internal = String(source.message ?? '');
  if (
    code === 'invalid_credentials' ||
    /invalid login credentials/i.test(internal)
  )
    return {
      message:
        'Email or password is incorrect. Check both entries and try again.',
      field: 'password',
    };
  if (code === 'email_not_confirmed')
    return {
      message:
        'Email ownership has not been confirmed. Complete the existing account setup or ask your project administrator for help.',
      field: 'email',
    };
  if (status === 429 || code?.startsWith('over_'))
    return {
      message: 'Too many attempts. Wait a few minutes before trying again.',
      field: '',
    };
  if (code === 'weak_password' || code === 'same_password')
    return {
      message:
        'Choose a different password with at least 12 characters that meets the account password requirements.',
      field: 'password',
    };
  if (
    ['otp_expired', 'flow_state_expired', 'bad_code_verifier'].includes(
      code ?? '',
    ) ||
    /valid password recovery link/i.test(internal)
  )
    return {
      message:
        'This recovery session is unavailable or expired. Request a new link and open it in the same browser that requested it.',
      field: '',
    };
  return {
    message: recovery
      ? 'The recovery action could not be confirmed. Check your connection and try again; if it continues, contact the project administrator.'
      : 'Sign-in could not be completed. Check your connection and try again.',
    field: '',
  };
}
