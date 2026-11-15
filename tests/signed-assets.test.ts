// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { SignedAssets } from '../src/backend/signed-assets';
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('discards an in-flight private signature when the Auth identity changes', async () => {
  let finish!: (value: { url: string; label: string }) => void;
  const store = new SignedAssets(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const pending = store.get('private');
  store.clear();
  finish({ url: 'old-session-private-token', label: 'private' });
  await expect(pending).rejects.toThrow('Asset unavailable');
  expect(store.peek('private')).toBeUndefined();
  store.dispose();
});

it('deduplicates simultaneous cover/preview loads and renews only observed assets before expiry', async () => {
  vi.useFakeTimers();
  const sign = vi.fn(async (id: string) => ({
    url: `${id}/${sign.mock.calls.length}`,
    label: id,
  }));
  const store = new SignedAssets(sign);
  await Promise.all([
    store.get('cover'),
    store.get('cover'),
    store.get('cover'),
  ]);
  expect(sign).toHaveBeenCalledTimes(1);
  await store.get('unmounted');
  const stop = store.observe(['cover', 'cover'], vi.fn());
  await vi.advanceTimersByTimeAsync(240_010);
  expect(sign).toHaveBeenCalledTimes(3);
  expect(store.peek('cover')?.url).toBe('cover/3');
  stop();
  await vi.advanceTimersByTimeAsync(600_000);
  expect(sign).toHaveBeenCalledTimes(3);
  store.dispose();
});

it('pauses hidden-tab work and renews on visibility/focus without duplicate signing', async () => {
  vi.useFakeTimers();
  let hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  const sign = vi.fn(async () => ({
    url: `signed/${sign.mock.calls.length}`,
    label: 'cover',
  }));
  const store = new SignedAssets(sign);
  store.start();
  await store.get('cover');
  store.observe(['cover'], vi.fn());
  hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  await vi.advanceTimersByTimeAsync(600_000);
  expect(sign).toHaveBeenCalledTimes(1);
  hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  window.dispatchEvent(new Event('focus'));
  await vi.advanceTimersByTimeAsync(1);
  expect(sign).toHaveBeenCalledTimes(2);
  store.dispose();
});

it('recovers an expired-image failure once, ignores stale errors and bounds broken-image retries', async () => {
  vi.useFakeTimers();
  const sign = vi.fn(async () => ({
    url: `signed/${sign.mock.calls.length}`,
    label: 'private preview',
  }));
  const store = new SignedAssets(sign);
  const old = await store.get('private');
  await vi.advanceTimersByTimeAsync(301_000);
  await Promise.all([
    store.get('private', old.url),
    store.get('private', old.url),
  ]);
  expect(sign).toHaveBeenCalledTimes(2);
  await store.get('private', old.url);
  await store.get('private', store.peek('private')!.url);
  expect(sign).toHaveBeenCalledTimes(2);
  store.dispose();
});

it('fails closed on signing denial, stops automatic retries and clears private URLs on session change', async () => {
  vi.useFakeTimers();
  const sign = vi.fn(async () => ({ url: 'private-token', label: 'private' }));
  const store = new SignedAssets(sign);
  store.start();
  await store.get('private');
  store.observe(['private'], vi.fn());
  sign.mockRejectedValue(new Error('denied'));
  await vi.advanceTimersByTimeAsync(240_010);
  expect(store.peek('private')).toBeUndefined();
  expect(store.unavailable('private')).toBe(true);
  await vi.advanceTimersByTimeAsync(900_000);
  expect(sign).toHaveBeenCalledTimes(2);
  store.resume();
  store.resume();
  await vi.advanceTimersByTimeAsync(1);
  expect(sign).toHaveBeenCalledTimes(3);
  store.clear();
  expect(store.peek('private')).toBeUndefined();
  store.dispose();
  window.dispatchEvent(new Event('focus'));
  expect(sign).toHaveBeenCalledTimes(3);
});
