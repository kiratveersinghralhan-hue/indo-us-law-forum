// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { mountSculpture } from '../src/motion/sculpture-engine';

const mocks = vi.hoisted(() => ({
  failCreation: false,
  renderer: {
    domElement: null as HTMLCanvasElement | null,
    setPixelRatio: vi.fn(),
    setClearColor: vi.fn(),
    setSize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    forceContextLoss: vi.fn(),
  },
  killScroll: vi.fn(),
  killTween: vi.fn(),
}));
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();
  return {
    ...actual,
    WebGLRenderer: class {
      constructor() {
        if (mocks.failCreation) throw new Error('WebGL unavailable');
        mocks.renderer.domElement = document.createElement('canvas');
        return mocks.renderer;
      }
    },
  };
});
vi.mock('gsap', () => ({
  gsap: {
    registerPlugin: vi.fn(),
    to: vi.fn(() => ({
      scrollTrigger: { kill: mocks.killScroll },
      kill: mocks.killTween,
    })),
  },
}));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: {} }));

let intersection: (entries: { isIntersecting: boolean }[]) => void;
let resized: () => void;
let resizeDisconnect: ReturnType<typeof vi.fn>;
let intersectionDisconnect: ReturnType<typeof vi.fn>;
let queue: Map<number, FrameRequestCallback>;
let host: HTMLElement;
let cleanup: (() => void) | undefined;
let hidden = false;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.failCreation = false;
  mocks.renderer.render.mockReset();
  vi.spyOn(performance, 'now').mockReturnValue(0);
  document.body.innerHTML =
    '<div class="hero"><div class="sculpture-stage"><div id="host"></div></div></div>';
  host = document.getElementById('host')!;
  Object.defineProperty(host, 'clientWidth', {
    configurable: true,
    value: 500,
  });
  Object.defineProperty(host, 'clientHeight', {
    configurable: true,
    value: 466,
  });
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1440,
  });
  hidden = false;
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  });
  Object.defineProperty(window, 'devicePixelRatio', {
    configurable: true,
    value: 3,
  });
  queue = new Map();
  let id = 0;
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback) => {
      queue.set(++id, callback);
      return id;
    }),
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((key) => queue.delete(key)),
  );
  resizeDisconnect = vi.fn();
  intersectionDisconnect = vi.fn();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resized = callback;
      }
      observe() {}
      disconnect = resizeDisconnect;
    },
  );
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: typeof intersection) {
        intersection = callback;
      }
      observe() {}
      disconnect = intersectionDisconnect;
    },
  );
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function frame(now: number) {
  const callbacks = [...queue.values()];
  queue.clear();
  callbacks.forEach((callback) => callback(now));
}
describe('sculpture lifecycle with mocked renderer and real procedural geometry', () => {
  it.each([390, 1440])(
    'keeps responsive %ipx entrance frames steady at fractional RAF boundaries',
    (width) => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: width,
      });
      cleanup = mountSculpture(host);
      intersection([{ isIntersecting: true }]);
      frame(1000);
      for (let tick = 1; tick <= 60; tick++)
        frame(1000 + Math.round(((tick * 1000) / 60) * 10) / 10);
      const expected = 60;
      expect(mocks.renderer.render.mock.calls.length).toBeGreaterThanOrEqual(
        expected,
      );
      expect(mocks.renderer.render.mock.calls.length).toBeLessThanOrEqual(
        expected + 1,
      );
      expect(queue.size).toBe(1);
    },
  );
  it('keeps WebGL available if the optional ScrollTrigger initialization fails', () => {
    vi.mocked(gsap.to).mockImplementationOnce(() => {
      throw new Error('GSAP unavailable');
    });
    cleanup = mountSculpture(host, { covers: ['', '', ''] });
    intersection([{ isIntersecting: true }]);
    frame(1000);
    expect(host.parentElement?.getAttribute('data-webgl')).toBe('ready');
    expect(host.querySelectorAll('canvas')).toHaveLength(1);
  });
  it('renders reduced motion once, redraws only for resize, and never starts scroll or pointer motion', () => {
    cleanup = mountSculpture(host, { reduced: true, finePointer: true });
    expect(gsap.to).not.toHaveBeenCalled();
    intersection([{ isIntersecting: true }]);
    frame(1000);
    expect(mocks.renderer.render).toHaveBeenCalledTimes(1);
    expect(queue.size).toBe(0);
    intersection([{ isIntersecting: false }]);
    intersection([{ isIntersecting: true }]);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(queue.size).toBe(0);
    resized();
    expect(queue.size).toBe(1);
    frame(2000);
    expect(mocks.renderer.render).toHaveBeenCalledTimes(2);
    expect(queue.size).toBe(0);
  });
  it.each([320, 375, 390, 695, 768, 1024, 1440])(
    'fits the real geometry inside a %ipx viewport and adapts after orientation change',
    (width) => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: width,
      });
      const containerWidth = width <= 600 ? width - 40 : (width - 64) * 0.4;
      Object.defineProperty(host, 'clientWidth', {
        configurable: true,
        value: containerWidth,
      });
      cleanup = mountSculpture(host, { reduced: true });
      intersection([{ isIntersecting: true }]);
      frame(1000);
      const [scene, camera] = mocks.renderer.render.mock.calls[0] as [
        THREE.Scene,
        THREE.PerspectiveCamera,
      ];
      camera.updateMatrixWorld();
      const bounds = new THREE.Box3().setFromObject(scene);
      for (const x of [bounds.min.x, bounds.max.x]) {
        for (const y of [bounds.min.y, bounds.max.y]) {
          for (const z of [bounds.min.z, bounds.max.z]) {
            const projected = new THREE.Vector3(x, y, z).project(camera);
            expect(Math.abs(projected.x)).toBeLessThan(1);
            expect(Math.abs(projected.y)).toBeLessThan(1);
          }
        }
      }
      const oldAspect = camera.aspect;
      Object.defineProperty(host, 'clientWidth', {
        configurable: true,
        value: 600,
      });
      Object.defineProperty(host, 'clientHeight', {
        configurable: true,
        value: 300,
      });
      resized();
      frame(2000);
      expect(camera.aspect).toBe(2);
      expect(camera.aspect).not.toBe(oldAspect);
      expect(host.querySelectorAll('canvas')).toHaveLength(1);
    },
  );
  it('keeps three bounded publication volumes and adapts DPR on small devices', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
    });
    cleanup = mountSculpture(host, { covers: ['', '', ''] });
    intersection([{ isIntersecting: true }]);
    frame(1000);
    expect(mocks.renderer.setPixelRatio).toHaveBeenLastCalledWith(1);
    const scene = mocks.renderer.render.mock.calls[0][0] as THREE.Scene;
    const volumes: THREE.Object3D[] = [];
    const geometry = new Set<THREE.BufferGeometry>();
    scene.traverse((node) => {
      if (node.userData.coverIndex !== undefined) volumes.push(node);
      if (node instanceof THREE.Mesh) geometry.add(node.geometry);
    });
    expect(volumes).toHaveLength(3);
    expect(geometry.size).toBeLessThanOrEqual(6);
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440,
    });
    resized();
    expect(mocks.renderer.setPixelRatio).toHaveBeenLastCalledWith(1.5);
  });
  it('reduced motion selects a volume with one redraw and no ongoing animation', () => {
    cleanup = mountSculpture(host, { reduced: true, covers: ['', '', ''] });
    intersection([{ isIntersecting: true }]);
    frame(1000);
    const scene = mocks.renderer.render.mock.calls[0][0] as THREE.Scene;
    let selectedVolume: THREE.Object3D | undefined;
    scene.traverse((node) => {
      if (node.userData.coverIndex === 2) selectedVolume = node;
    });
    const oldDepth = selectedVolume!.position.z;
    host.dispatchEvent(new CustomEvent('publication-select', { detail: 2 }));
    frame(2000);
    expect(selectedVolume!.position.z).toBeGreaterThan(oldDepth);
    expect(mocks.renderer.render).toHaveBeenCalledTimes(2);
    expect(queue.size).toBe(0);
    host.dispatchEvent(new CustomEvent('publication-select', { detail: 99 }));
    expect(queue.size).toBe(0);
  });
  it('preserves the fallback when WebGL construction fails', () => {
    mocks.failCreation = true;
    cleanup = mountSculpture(host);
    expect(host.querySelector('canvas')).toBeNull();
    expect(host.parentElement?.hasAttribute('data-webgl')).toBe(false);
    expect(queue.size).toBe(0);
  });
  it('caps pixel ratio, pauses offscreen and hidden, and resumes when visible', () => {
    cleanup = mountSculpture(host);
    expect(mocks.renderer.setPixelRatio).toHaveBeenCalledWith(1.5);
    expect(queue.size).toBe(0);
    intersection([{ isIntersecting: true }]);
    frame(1000);
    expect(mocks.renderer.render).toHaveBeenCalledTimes(1);
    expect(host.parentElement?.getAttribute('data-webgl')).toBe('ready');
    frame(1010);
    expect(mocks.renderer.render).toHaveBeenCalledTimes(1);
    intersection([{ isIntersecting: false }]);
    frame(1100);
    expect(mocks.renderer.render).toHaveBeenCalledTimes(1);
    hidden = true;
    intersection([{ isIntersecting: true }]);
    expect(queue.size).toBe(0);
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    frame(1200);
    expect(mocks.renderer.render).toHaveBeenCalledTimes(2);
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(queue.size).toBe(0);
  });
  it('restores fallback and removes resources on context loss, with idempotent unmount', () => {
    const geometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const materialDispose = vi.spyOn(THREE.Material.prototype, 'dispose');
    cleanup = mountSculpture(host, { covers: ['', '', ''] });
    intersection([{ isIntersecting: true }]);
    frame(1000);
    host
      .querySelector('canvas')!
      .dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    expect(host.querySelector('canvas')).toBeNull();
    expect(host.parentElement?.hasAttribute('data-webgl')).toBe(false);
    expect(queue.size).toBe(0);
    expect(geometryDispose).toHaveBeenCalled();
    expect(materialDispose).toHaveBeenCalledTimes(4);
    expect(resizeDisconnect).toHaveBeenCalledTimes(1);
    expect(intersectionDisconnect).toHaveBeenCalledTimes(1);
    expect(mocks.killScroll).toHaveBeenCalledTimes(1);
    expect(mocks.killTween).toHaveBeenCalledTimes(1);
    cleanup();
    expect(mocks.renderer.dispose).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(queue.size).toBe(0);
  });
  it('falls back if rendering fails after initialization', () => {
    mocks.renderer.render.mockImplementation(() => {
      throw new Error('GPU failure');
    });
    cleanup = mountSculpture(host, { covers: ['', '', ''] });
    intersection([{ isIntersecting: true }]);
    frame(1000);
    expect(host.querySelector('canvas')).toBeNull();
    expect(queue.size).toBe(0);
  });
});

describe('compact demand rendering', () => {
  it('settles at idle, wakes for scroll and selection, then sleeps again', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    cleanup = mountSculpture(host, { covers: ['', '', ''] });
    intersection([{ isIntersecting: true }]);
    for (let i = 0; i <= 360; i++) frame(1000 + i * 1000 / 60);
    expect(queue.size).toBe(0);
    const idleCalls = mocks.renderer.render.mock.calls.length;
    frame(8000);
    expect(mocks.renderer.render).toHaveBeenCalledTimes(idleCalls);
    const progress = vi.mocked(gsap.to).mock.calls[0][0] as { depth: number };
    progress.depth = -0.6;
    const options = vi.mocked(gsap.to).mock.calls[0][1] as { onUpdate: () => void };
    options.onUpdate();
    expect(queue.size).toBe(1);
    for (let i = 0; i <= 360; i++) frame(9000 + i * 1000 / 60);
    expect(mocks.renderer.render.mock.calls.length).toBeGreaterThan(idleCalls);
    expect(queue.size).toBe(0);
    host.dispatchEvent(new CustomEvent('publication-select', { detail: 2 }));
    expect(queue.size).toBe(1);
    for (let i = 0; i <= 360; i++) frame(16000 + i * 1000 / 60);
    expect(queue.size).toBe(0);
    expect(host.querySelectorAll('canvas')).toHaveLength(1);
  });
  it('uses the existing compact frame cap after sustained expensive submission', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    mocks.renderer.render.mockImplementation(() => vi.mocked(performance.now).mockReturnValue(20));
    cleanup = mountSculpture(host);
    intersection([{ isIntersecting: true }]);
    for (let i = 0; i < 8; i++) {
      vi.mocked(performance.now).mockReturnValue(0);
      frame(1000 + i * 1000 / 60);
    }
    const count = mocks.renderer.render.mock.calls.length;
    vi.mocked(performance.now).mockReturnValue(0);
    frame(1000 + 8 * 1000 / 60);
    expect(mocks.renderer.render).toHaveBeenCalledTimes(count);
    frame(1000 + 9 * 1000 / 60);
    expect(mocks.renderer.render).toHaveBeenCalledTimes(count + 1);
  });
});
