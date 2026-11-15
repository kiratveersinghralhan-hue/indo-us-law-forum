import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useMotion } from '../motion/use-motion';
import { motionSettings } from '../config/motion';
gsap.registerPlugin(ScrollTrigger);

// Full homepage reveals replay only after completely leaving the section.
// Opacity never reaches zero; failure and Reduced leave content available.
export function useReveal() {
  const scope = useRef<HTMLDivElement>(null);
  const { reduced, mode } = useMotion();
  useEffect(() => {
    const root = scope.current;
    if (reduced || !root) return;
    const seen = new WeakSet<Element>();
    const targets: Element[] = [];
    const triggers: ScrollTrigger[] = [];
    const context = gsap.context(() => {}, root);
    const setup = (nodes: Element[]) => {
      context.add(() => {
        nodes.forEach((node) => {
          if (seen.has(node)) return;
          seen.add(node);
          targets.push(node);
          const cinematic = mode === 'full' && !!node.closest('.public-home');
          if (cinematic) {
            const image = node.getAttribute('data-reveal') === 'image';
            const tween = gsap.fromTo(
              node,
              {
                opacity: 0.45,
                y:
                  node.querySelector('#focus-heading')
                    ? 0
                    : window.innerWidth <= 860
                      ? motionSettings.compactRevealDistance
                      : motionSettings.revealDistance,
                scale: image ? 0.97 : 1,
              },
              {
                opacity: 1,
                y: 0,
                scale: 1,
                paused: true,
                immediateRender: false,
                duration: motionSettings.revealDuration,
                ease: motionSettings.ease,
                clearProps: 'transform,opacity',
              },
            );
            triggers.push(
              ScrollTrigger.create({
                trigger: node,
                start: 'top bottom',
                end: 'bottom top',
                invalidateOnRefresh: true,
                onEnter: () => tween.restart(),
                onEnterBack: () => tween.restart(),
                onLeave: () => tween.pause(0),
                onLeaveBack: () => tween.pause(0),
              }),
            );
          } else
            gsap.from(node, {
              y: () => (node.closest('.public-home') ? 18 : 10),
              duration: motionSettings.revealDuration,
              ease: motionSettings.ease,
              clearProps: 'transform',
              scrollTrigger: {
                trigger: node,
                start: 'top 92%',
                end: 'bottom top',
                toggleActions: 'play none none reverse',
                invalidateOnRefresh: true,
              },
            });
        });
      });
    };
    let observer: MutationObserver | undefined;
    const revert = () => {
      // Stop trigger callbacks before reverting their lazy start-at tweens.
      triggers.forEach((trigger) => trigger.kill());
      context.revert();
      gsap.set(targets, { clearProps: 'transform,opacity' });
    };
    try {
      setup([...root.querySelectorAll('[data-reveal]')]);
      // Discover only newly inserted groups, rather than rescanning the page
      // when carousel announcements or selected article text change.
      observer = new MutationObserver((records) => {
        const additions: Element[] = [];
        records.forEach((record) =>
          record.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            if (node.matches('[data-reveal]')) additions.push(node);
            additions.push(...node.querySelectorAll('[data-reveal]'));
          }),
        );
        if (additions.length) setup(additions);
      });
      observer.observe(root, { childList: true, subtree: true });
    } catch {
      revert();
    }
    return () => {
      observer?.disconnect();
      revert();
    };
  }, [reduced, mode]);
  return scope;
}
