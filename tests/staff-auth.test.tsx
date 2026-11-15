// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StaffLogin } from '../src/backend/auth-ui';
import { DemoEnvironmentContext } from '../src/admin/context';
import { authFailure } from '../src/backend/auth-errors';
import type { WebsiteEnvironment } from '../src/backend/contracts';
vi.mock('../src/hooks/use-reveal', () => ({
  useReveal: () => ({ current: null }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('classifies safe Auth causes without reflecting passwords or tokens in diagnostics', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  expect(
    authFailure(
      {
        code: 'invalid_credentials',
        status: 400,
        message: 'secret-password token=private',
      },
      false,
    ),
  ).toMatchObject({
    field: 'password',
    message: expect.stringContaining('incorrect'),
  });
  expect(
    authFailure({ status: 429, message: 'private' }, false).message,
  ).toContain('Wait a few minutes');
  expect(
    authFailure({ code: 'otp_expired', message: 'private' }, true).message,
  ).toContain('same browser');
  expect(
    authFailure({ code: 'same_password', message: 'private' }, true).field,
  ).toBe('password');
  expect(JSON.stringify(warn.mock.calls)).not.toContain('private');
  expect(JSON.stringify(warn.mock.calls)).not.toContain('secret-password');
});
it('recovery password validation keeps the existing recovery-session authorization and update API (mock provider)', async () => {
  let recovery = true;
  const update = vi.fn(async () => {
    recovery = false;
  });
  const environment = {
    subscribe: () => () => {},
    getRevision: () => 0,
    backend: {
      getSession: () => ({
        recovery,
        user: { id: 'test-user' },
        loading: false,
        role: 'editor',
      }),
      updatePassword: update,
    },
  } as unknown as WebsiteEnvironment;
  render(
    <MemoryRouter>
      <DemoEnvironmentContext.Provider value={environment}>
        <StaffLogin recovery />
      </DemoEnvironmentContext.Provider>
    </MemoryRouter>,
  );
  const password = screen.getByLabelText(
    'New password (at least 12 characters)',
  );
  fireEvent.change(password, { target: { value: 'short' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
  expect(
    screen.getByText('Your password has 5 characters; use at least 12.', {
      selector: '#staff-password-error',
    }),
  ).toBeTruthy();
  expect(update).not.toHaveBeenCalled();
  fireEvent.change(password, { target: { value: 'fictional-new-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
  await waitFor(() => expect(update).toHaveBeenCalledOnce());
  await waitFor(() =>
    expect(
      screen.getByText('Password updated. Return to staff sign-in.'),
    ).toBeTruthy(),
  );
  expect((password as HTMLInputElement).value).toBe('');
  expect(
    (
      screen.getByRole('button', {
        name: 'Update password',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
