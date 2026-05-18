import gsap from 'gsap';
import { bindScrollTriggerLayoutRefresh } from './common';

export function initSectionAnimations(): void {
  function fadeSection(section: Element): void {
    const cards = section.querySelectorAll(
      '.grid-4 > *, .grid-2 > *:not(.warm-panel):not(.cool-panel), .primary-grid > *, .harmony-card'
    );
    const label = section.querySelector('.section-label');
    const title = section.querySelector('.section-title');
    const sub = section.querySelector('.section-sub');

    if (label) {
      gsap.from(label, {
        scrollTrigger: { trigger: section as gsap.DOMTarget, start: 'top 80%' },
        opacity: 0, y: 20, duration: 0.6, ease: 'power2.out',
      });
    }
    if (title) {
      gsap.from(title, {
        scrollTrigger: { trigger: section as gsap.DOMTarget, start: 'top 78%' },
        opacity: 0, y: 25, duration: 0.6, ease: 'power2.out', delay: 0.1,
      });
    }
    if (sub) {
      gsap.from(sub, {
        scrollTrigger: { trigger: section as gsap.DOMTarget, start: 'top 76%' },
        opacity: 0, y: 20, duration: 0.6, ease: 'power2.out', delay: 0.2,
      });
    }
    if (cards.length) {
      gsap.from(cards, {
        scrollTrigger: { trigger: section as gsap.DOMTarget, start: 'top 70%' },
        opacity: 0, y: 40, duration: 0.7, ease: 'power2.out', stagger: 0.12,
      });
    }
  }

  document.querySelectorAll('section[id]:not(#hero)').forEach(fadeSection);

  gsap.from('#mainWheel', {
    scrollTrigger: { trigger: '#wheel', start: 'top 75%' },
    opacity: 0, scale: 0.5, rotate: -270, duration: 1.6, ease: 'elastic.out(1, 0.45)',
  });
  gsap.from('#mainWheel', {
    scrollTrigger: { trigger: '#wheel', start: 'top 75%' },
    filter: 'blur(12px)', duration: 1, ease: 'power2.out', delay: 0.2,
  });

  gsap.from('.wheel-accent', {
    scrollTrigger: { trigger: '#wheel .grid-3', start: 'top 85%' },
    scaleX: 0, transformOrigin: 'left center', duration: 1.2, ease: 'power3.inOut',
  });

  gsap.from('.fact-icon', {
    scrollTrigger: { trigger: '#wheel .grid-3', start: 'top 80%' },
    scale: 0, rotation: -45, duration: 0.7, ease: 'back.out(2)', stagger: 0.12,
  });

  gsap.from('.wheel-fact', {
    scrollTrigger: { trigger: '#wheel .grid-3', start: 'top 80%' },
    y: 60, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12,
  });

  gsap.from('#mixer color-mixer', {
    scrollTrigger: { trigger: '#mixer', start: 'top 78%' },
    opacity: 0, y: 48, duration: 1, ease: 'power3.out',
  });

  gsap.utils.toArray('section[id]:not(#hero)').forEach((sUnknown) => {
    const s = sUnknown as gsap.DOMTarget;
    gsap.fromTo(
      s,
      { backgroundPosition: '50% 0%' },
      {
        backgroundPosition: '50% 100%',
        ease: 'none',
        scrollTrigger: { trigger: s, start: 'top bottom', end: 'bottom top', scrub: 1 },
      }
    );
  });

  gsap.from('#warmcool .warm-panel', {
    scrollTrigger: { trigger: '#warmcool', start: 'top 82%', toggleActions: 'play none none none' },
    opacity: 0, x: -72, duration: 0.75, ease: 'power3.out',
  });
  gsap.from('#warmcool .cool-panel', {
    scrollTrigger: { trigger: '#warmcool', start: 'top 82%', toggleActions: 'play none none none' },
    opacity: 0, x: 72, duration: 0.75, ease: 'power3.out', delay: 0.12,
  });

  if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.wheel-fact').forEach((card) => {
      const icon = card.querySelector('.fact-icon');
      card.addEventListener('mouseenter', () => {
        gsap.to(card, { scale: 1.04, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
        if (icon) gsap.to(icon, { scale: 1.25, rotation: 8, duration: 0.4, ease: 'back.out(2)', overwrite: 'auto' });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, { scale: 1, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
        if (icon) gsap.to(icon, { scale: 1, rotation: 0, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
      });
    });
  }

  bindScrollTriggerLayoutRefresh();
}
