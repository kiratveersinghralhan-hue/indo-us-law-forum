// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import WebGLScene from '../src/motion/webgl-scene';

const mocks = vi.hoisted(() => ({ mount: vi.fn(), dispose: vi.fn(), selected: vi.fn() }));
vi.mock('../src/motion/sculpture-engine', () => ({ mountSculpture: mocks.mount }));
let enter: (entries: { isIntersecting: boolean }[]) => void;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.mount.mockImplementation((element: HTMLElement) => {
    const select = (event: Event) => mocks.selected((event as CustomEvent<number>).detail);
    element.addEventListener('publication-select', select);
    return () => {
      element.removeEventListener('publication-select', select);
      mocks.dispose();
    };
  });
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: typeof enter) { enter = callback; }
    observe() {}
    disconnect() {}
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('defers initialization and reuses equivalent covers while forwarding the latest selection callback', () => {
  const first = vi.fn(), next = vi.fn();
  const view = render(<WebGLScene reduced={false} finePointer={false} covers={['cover-a']} selected={0} onSelect={first} />);
  expect(mocks.mount).not.toHaveBeenCalled();
  enter([{ isIntersecting: false }]);
  expect(mocks.mount).not.toHaveBeenCalled();
  enter([{ isIntersecting: true }]);
  expect(mocks.mount).toHaveBeenCalledTimes(1);
  view.rerender(<WebGLScene reduced={false} finePointer={false} covers={['cover-a']} selected={0} onSelect={next} />);
  expect(mocks.mount).toHaveBeenCalledTimes(1);
  expect(mocks.dispose).not.toHaveBeenCalled();
  mocks.mount.mock.calls[0][1].onSelect(0);
  expect(next).toHaveBeenCalledWith(0);
  expect(first).not.toHaveBeenCalled();
  view.rerender(<WebGLScene reduced={false} finePointer={false} covers={['cover-b']} selected={0} onSelect={next} />);
  expect(mocks.dispose).toHaveBeenCalledTimes(1);
  enter([{ isIntersecting: true }]);
  expect(mocks.mount).toHaveBeenCalledTimes(2);
  expect(mocks.mount.mock.calls[1][1].covers).toEqual(['cover-b']);
  view.unmount();
  expect(mocks.dispose).toHaveBeenCalledTimes(2);
});
it('does not initialize after unmount before intersection', () => {
  const view = render(<WebGLScene reduced={true} finePointer={false} covers={[]} selected={0} />);
  view.unmount();
  enter([{ isIntersecting: true }]);
  expect(mocks.mount).not.toHaveBeenCalled();
});

it.each([true, false])('delivers the initial selection to the deferred engine (reduced=%s)', (reduced) => {
  render(<WebGLScene reduced={reduced} finePointer={false} covers={[]} selected={1} />);
  // Like the real engine, the mock installs its listener only inside mountSculpture.
  expect(mocks.selected).not.toHaveBeenCalled();
  enter([{ isIntersecting: true }]);
  expect(mocks.selected.mock.calls).toEqual([[1]]);
  enter([{ isIntersecting: true }]);
  expect(mocks.mount).toHaveBeenCalledTimes(1);
  expect(mocks.selected.mock.calls).toEqual([[1]]);
});
it('replays the latest selection before entry and keeps later selection changes on the same engine', () => {
  const view = render(<WebGLScene reduced={true} finePointer={false} covers={[]} selected={0} />);
  view.rerender(<WebGLScene reduced={true} finePointer={false} covers={[]} selected={2} />);
  expect(mocks.mount).not.toHaveBeenCalled();
  enter([{ isIntersecting: true }]);
  expect(mocks.selected.mock.calls).toEqual([[2]]);
  view.rerender(<WebGLScene reduced={true} finePointer={false} covers={[]} selected={1} />);
  expect(mocks.selected.mock.calls).toEqual([[2], [1]]);
  expect(mocks.mount).toHaveBeenCalledTimes(1);
  expect(mocks.dispose).not.toHaveBeenCalled();

  view.rerender(<WebGLScene reduced={false} finePointer={false} covers={['new-cover']} selected={2} />);
  expect(mocks.dispose).toHaveBeenCalledTimes(1);
  expect(mocks.mount).toHaveBeenCalledTimes(1);
  enter([{ isIntersecting: true }]);
  expect(mocks.selected.mock.calls).toEqual([[2], [1], [2]]);
  expect(mocks.mount).toHaveBeenCalledTimes(2);
  view.unmount();
  expect(mocks.dispose).toHaveBeenCalledTimes(2);
});
