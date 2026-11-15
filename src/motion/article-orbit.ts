import { gsap } from 'gsap';
import { motionSettings } from '../config/motion';

export const wrapArticleIndex = (index: number, count: number) =>
  ((index % count) + count) % count;
const normalizeAngle = (angle: number) =>
  ((((angle + 180) % 360) + 360) % 360) - 180;

// The rotor has one transform owner. Only transient tweens or a coalesced drag
// frame draw; selection updates React once, never on an animation frame.
export function mountArticleOrbit(
  stage: HTMLElement,
  count: number,
  initial: number,
  onSelect: (index: number) => void,
) {
  const rotor = stage.querySelector<HTMLElement>('.orbit-rotor')!;
  const step = 360 / count;
  const value = { angle: -initial * step };
  let radius = 180,
    width = 500,
    tween: gsap.core.Tween | undefined;
  let pointerFrame = 0,
    visible = false,
    disposed = false,
    interacted = false;
  let gesture:
    | {
        id: number;
        x: number;
        y: number;
        angle: number;
        pending: number;
        dragged: boolean;
        target: number | null;
      }
    | undefined;
  const paint = () => {
    rotor.style.transform = `translateZ(${-radius}px) rotateY(${value.angle}deg)`;
    if (import.meta.env.DEV) stage.dataset.orbitAngle = value.angle.toFixed(2);
  };
  const turn = (angle: number, announce = true) => {
    tween?.kill();
    if (announce) onSelect(wrapArticleIndex(Math.round(-angle / step), count));
    try {
      tween = gsap.to(value, {
        angle,
        duration: motionSettings.orbitSnapDuration,
        ease: motionSettings.orbitEase,
        onUpdate: paint,
        onComplete: () => {
          value.angle = normalizeAngle(value.angle);
          paint();
          tween = undefined;
        },
      });
      if (!visible || document.hidden) tween.pause();
    } catch {
      value.angle = normalizeAngle(angle);
      paint();
    }
  };
  const select = (index: number) => {
    interacted = true;
    const target = -wrapArticleIndex(index, count) * step;
    turn(value.angle + normalizeAngle(target - value.angle));
  };
  const resize = () => {
    width = Math.max(stage.clientWidth, 200);
    // Size covers from both stage dimensions, then derive the radius from the
    // cover so neighbours sit just behind the front cover at every count.
    const height = Math.max(stage.clientHeight, 240);
    const cover = Math.min(Math.max(width * 0.4, 140), height * 0.56, 270);
    radius =
      count <= 3
        ? cover * 0.74
        : ((cover * 0.56) / Math.sin(Math.PI / count)) * 1.04;
    stage.style.setProperty('--orbit-radius', `${radius}px`);
    stage.style.setProperty('--orbit-cover-width', `${cover}px`);
    paint();
  };
  const release = () => {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    const id = gesture?.id;
    gesture = undefined;
    if (id !== undefined && stage.hasPointerCapture(id))
      stage.releasePointerCapture(id);
    stage.classList.remove('is-dragging');
  };
  const down = (event: PointerEvent) => {
    if (
      !event.isPrimary ||
      (event.pointerType === 'mouse' && event.button !== 0)
    )
      return;
    const cover = (event.target as Element).closest<HTMLElement>(
      '[data-cover-index]',
    );
    gesture = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      angle: value.angle,
      pending: value.angle,
      dragged: false,
      target: cover ? Number(cover.dataset.coverIndex) : null,
    };
  };
  const move = (event: PointerEvent) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x,
      dy = event.clientY - gesture.y;
    if (!gesture.dragged) {
      // Leave vertical/pinch gestures to the browser, without pointer capture.
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        release();
        return;
      }
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      // Take over the rotor only after horizontal intent is established.
      // A vertical touch gesture must not freeze an in-flight selection tween.
      tween?.kill();
      tween = undefined;
      gesture.angle = value.angle;
      gesture.pending = value.angle;
      gesture.dragged = true;
      interacted = true;
      stage.setPointerCapture(event.pointerId);
      stage.classList.add('is-dragging');
    }
    if (event.cancelable) event.preventDefault();
    gesture.pending =
      gesture.angle +
      Math.max(-360, Math.min(360, (dx * 360) / Math.max(width * 1.2, 300)));
    if (!pointerFrame)
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        if (!disposed && gesture) {
          value.angle = gesture.pending;
          paint();
        }
      });
  };
  const up = (event: PointerEvent) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const current = gesture;
    if (current.dragged) value.angle = current.pending;
    release();
    if (current.dragged) turn(Math.round(value.angle / step) * step);
    else if (current.target !== null) select(current.target);
  };
  const cancel = () => {
    if (gesture) {
      const dragged = gesture.dragged;
      release();
      if (dragged) turn(Math.round(value.angle / step) * step);
    }
  };
  const lostCapture = (event: PointerEvent) => {
    // Touch starts with implicit capture on the child hit by the finger.
    // Transferring it to the stage emits a bubbled loss on that child, which
    // must not cancel the new horizontal drag owned by the stage.
    if (event.target === stage && gesture?.id === event.pointerId) cancel();
  };
  const suspend = () => {
    if (document.hidden || !visible) {
      cancel();
      tween?.pause();
    } else tween?.resume();
  };
  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !document.hidden && !interacted && !tween) {
        const rest = value.angle;
        value.angle += motionSettings.orbitEntryDegrees;
        paint();
        turn(rest, false); // Brief orientation cue, never an automatic slide change.
      }
      suspend();
    },
    { threshold: 0.12 },
  );
  const resizing = new ResizeObserver(resize);
  resize();
  resizing.observe(stage);
  observer.observe(stage);
  stage.addEventListener('pointerdown', down);
  stage.addEventListener('pointermove', move);
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', cancel);
  stage.addEventListener('lostpointercapture', lostCapture);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', suspend);
  return {
    select,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      release();
      tween?.kill();
      resizing.disconnect();
      observer.disconnect();
      stage.removeEventListener('pointerdown', down);
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerup', up);
      stage.removeEventListener('pointercancel', cancel);
      stage.removeEventListener('lostpointercapture', lostCapture);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', suspend);
      rotor.style.removeProperty('transform');
    },
  };
}
