import { useEffect, useRef } from 'react';
import { mountSculpture } from './sculpture-engine';
import type { SculptureOptions } from './sculpture-engine';

export default function WebGLScene({
  reduced,
  finePointer,
  covers,
  selected,
  onSelect,
}: SculptureOptions & { selected: number }) {
  const host = useRef<HTMLDivElement>(null);
  // Equivalent cover arrays and callback identities must not recreate WebGL.
  const coverKey = JSON.stringify(covers);
  const selection = useRef(onSelect);
  const selectedCover = useRef(selected);
  useEffect(() => {
    selection.current = onSelect;
    selectedCover.current = selected;
  }, [onSelect, selected]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (cancelled || !entry.isIntersecting || cleanup) return;
        observer.disconnect();
        cleanup = mountSculpture(element, {
          reduced,
          finePointer,
          covers: JSON.parse(coverKey) as string[],
          onSelect: (index) => selection.current?.(index),
        });
        // The selection effect may have run before this deferred listener existed.
        element.dispatchEvent(
          new CustomEvent('publication-select', { detail: selectedCover.current }),
        );
      },
      { rootMargin: '120px 0px' },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      cleanup?.();
    };
  }, [reduced, finePointer, coverKey]);
  useEffect(() => {
    host.current?.dispatchEvent(
      new CustomEvent('publication-select', { detail: selected }),
    );
  }, [selected, coverKey, reduced, finePointer]);
  return (
    <div
      className="sculpture-webgl"
      ref={host}
      aria-hidden="true"
      data-testid="sculpture-webgl"
    />
  );
}
