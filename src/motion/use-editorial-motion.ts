import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motionSettings } from '../config/motion';
import { useMotion } from './use-motion';
gsap.registerPlugin(ScrollTrigger);

export function useEditorialMotion(ready: boolean, layoutRevision = '') {
  const scope = useRef<HTMLDivElement>(null);
  const { reduced, mode } = useMotion();
  // Hero choreography is independent of content loading and renderer readiness.
  // Text remains in the DOM throughout; Plain/Reduced skips it entirely.
  useEffect(() => {
    const hero = scope.current?.querySelector<HTMLElement>('.hero');
    if (reduced || !hero) return;
    const context = gsap.context(() => {
      try {
        // Follow the optional intro rather than playing underneath it.
        const delay = document.querySelector('.editorial-intro') ? 1.75 : 0.15;
        const timeline = gsap.timeline({
          delay,
          defaults: { ease: motionSettings.heroEase },
        });
        timeline
          .fromTo(
            '.hero-rules span',
            { scaleY: 0 },
            { scaleY: 1, duration: 1.4, stagger: 0.08, ease: 'power2.inOut' },
            0,
          )
          .fromTo(
            '.hero-line > *',
            { yPercent: 108 },
            {
              yPercent: 0,
              duration: 1.15,
              stagger: 0.11,
              clearProps: 'transform',
            },
            0.1,
          )
          .fromTo(
            '.hero-copy .eyebrow, .hero-description, .hero-actions',
            { opacity: 0, y: 18 },
            {
              opacity: 1,
              y: 0,
              duration: 0.9,
              stagger: 0.08,
              clearProps: 'transform,opacity',
            },
            0.45,
          )
          .fromTo(
            '.publication-controls, .hero-bottom',
            { opacity: 0, y: 24 },
            {
              opacity: 1,
              y: 0,
              duration: 1,
              stagger: 0.1,
              clearProps: 'transform,opacity',
            },
            0.7,
          );
        // A gentle drift as the hero leaves; native scrolling is untouched.
        // The heading, not .hero-copy, which the shared reveal hook transforms.
        gsap.to('.hero-copy h1', {
          yPercent: -10,
          ease: 'none',
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.5,
          },
        });
      } catch {
        /* Content is already visible without choreography. */
      }
    }, hero);
    return () => context.revert();
  }, [reduced, mode]);
  useEffect(() => {
    if (reduced || !ready || !scope.current) return;
    const root = scope.current;
    const media = gsap.matchMedia();
    const removals: (() => void)[] = [];
    try {
      media.add(
        {
          all: '(min-width: 0px)',
          compact: '(max-width: 860px)',
          fine: '(hover: hover) and (pointer: fine)',
          desktop: '(min-width: 1025px)',
        },
        (context) => {
          const distance = context.conditions?.compact
            ? motionSettings.compactParallax
            : motionSettings.featuredParallax;
          // Architectural rules draw as each research column enters.
          root.querySelectorAll('.focus-row').forEach((row, index) => {
            gsap.fromTo(
              row.querySelector('.focus-rule'),
              { scaleX: 0 },
              {
                scaleX: 1,
                duration: 1.1,
                delay: index * 0.08,
                ease: 'power3.inOut',
                scrollTrigger: {
                  trigger: row,
                  start: 'top 88%',
                  toggleActions: 'play none none reverse',
                },
              },
            );
          });
          root
            .querySelectorAll('.section-heading h2, .repository-intro h2')
            .forEach((heading) =>
              gsap.fromTo(
                heading,
                { letterSpacing: '0.02em' },
                {
                  letterSpacing: '-0.025em',
                  ease: 'none',
                  scrollTrigger: {
                    trigger: heading,
                    start: 'top bottom',
                    end: 'top 45%',
                    scrub: 0.6,
                  },
                },
              ),
            );
          const caseRows = root.querySelectorAll('.repository-band .case-row');
          if (caseRows.length)
            gsap.fromTo(
              caseRows,
              { x: context.conditions?.compact ? 0 : 36, opacity: 0.5 },
              {
                x: 0,
                opacity: 1,
                duration: 0.9,
                stagger: 0.12,
                ease: motionSettings.ease,
                clearProps: 'transform,opacity',
                scrollTrigger: {
                  trigger: root.querySelector('.repository-chapters'),
                  start: 'top 80%',
                  toggleActions: 'play none none reverse',
                },
              },
            );
          const visuals = root.querySelectorAll(
            '.carousel-slide .editorial-art img',
          );
          if (visuals.length)
            gsap.fromTo(
              visuals,
              { y: distance, scale: 1.02 },
              {
                y: -distance,
                scale: motionSettings.featuredScale,
                ease: 'none',
                scrollTrigger: {
                  trigger: root.querySelector('.research-carousel'),
                  start: 'top bottom',
                  end: 'bottom top',
                  scrub: 0.65,
                },
              },
            );
          const orbit = root.querySelector('.orbit-camera');
          const orbitDistance = context.conditions?.compact
            ? motionSettings.compactOrbitParallax
            : motionSettings.orbitParallax;
          if (orbit)
            gsap.fromTo(
              orbit,
              {
                y: orbitDistance,
                scale: motionSettings.orbitFraming.startScale,
                rotationX: motionSettings.orbitFraming.startPitch,
              },
              {
                y: -orbitDistance,
                scale: motionSettings.orbitFraming.endScale,
                rotationX: motionSettings.orbitFraming.endPitch,
                ease: 'none',
                scrollTrigger: {
                  trigger: root.querySelector('.research-orbit'),
                  start: 'top bottom',
                  end: 'bottom top',
                  scrub: 0.45,
                },
              },
            );
          const story = root.querySelector('.repository-story');
          const archive = root.querySelector('.archive-plate img');
          if (story && archive && context.conditions?.desktop)
            gsap.fromTo(
              archive,
              { scale: 1, y: motionSettings.storyParallax },
              {
                scale: motionSettings.storyScale,
                y: -motionSettings.storyParallax,
                ease: 'none',
                scrollTrigger: {
                  trigger: story,
                  start: 'top bottom',
                  end: 'bottom top',
                  scrub: 0.6,
                },
              },
            );
          if (context.conditions?.fine)
            root
              .querySelectorAll<HTMLElement>(
                '.supporting-stories .article-card',
              )
              .forEach((card) => {
                let rect: DOMRect | null = null;
                const invalidate = () => {
                  rect = null;
                };
                const enter = () => {
                  rect = card.getBoundingClientRect();
                };
                gsap.set(card, { transformPerspective: 900 });
                const rotateX = gsap.quickTo(card, 'rotationX', {
                  duration: 0.6,
                  ease: motionSettings.ease,
                });
                const rotateY = gsap.quickTo(card, 'rotationY', {
                  duration: 0.6,
                  ease: motionSettings.ease,
                });
                const move = (event: PointerEvent) => {
                  if (event.pointerType === 'touch') return;
                  rect ??= card.getBoundingClientRect();
                  rotateX(
                    (0.5 - (event.clientY - rect.top) / rect.height) *
                      motionSettings.cardTiltDegrees *
                      2,
                  );
                  rotateY(
                    ((event.clientX - rect.left) / rect.width - 0.5) *
                      motionSettings.cardTiltDegrees *
                      2,
                  );
                };
                const reset = () => {
                  rotateX(0);
                  rotateY(0);
                };
                card.addEventListener('pointermove', move);
                card.addEventListener('pointerenter', enter);
                card.addEventListener('pointerleave', reset);
                window.addEventListener('resize', invalidate);
                window.addEventListener('scroll', invalidate, {
                  passive: true,
                });
                removals.push(() => {
                  card.removeEventListener('pointermove', move);
                  card.removeEventListener('pointerenter', enter);
                  card.removeEventListener('pointerleave', reset);
                  window.removeEventListener('resize', invalidate);
                  window.removeEventListener('scroll', invalidate);
                  rotateX.tween.kill();
                  rotateY.tween.kill();
                  gsap.set(card, { clearProps: 'transform' });
                });
              });
          return () => {
            removals.splice(0).forEach((remove) => remove());
          };
        },
        root,
      );
    } catch {
      removals.splice(0).forEach((remove) => remove());
      media.revert();
    }
    return () => {
      removals.splice(0).forEach((remove) => remove());
      media.revert();
    };
  }, [ready, reduced, mode, layoutRevision]);
  return scope;
}
