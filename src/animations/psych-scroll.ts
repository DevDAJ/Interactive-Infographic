import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { psychData } from '../data/psychology';
import { lerpColor } from '../utils/color';

export function initPsychScroll(): void {
  const stage = document.querySelector('.psych-stage');
  const panel = document.getElementById('psych-panel');
  const emojiEl = document.getElementById('psych-emoji');
  const nameEl = document.getElementById('psych-name');
  const descEl = document.getElementById('psych-desc');
  const scrub = document.getElementById('psychScrub');
  const scrubFill = document.getElementById('scrubFill');
  if (!stage || !panel || !nameEl || !descEl) return;
  void emojiEl;

  const total = psychData.length;
  let currentIndex = -1;

  const setEntry = (i: number): void => {
    const d = psychData[i];
    nameEl.textContent = d.name;
    descEl.textContent = d.desc;
    panel.style.setProperty('--psych-color', d.color);
  };

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    setEntry(0);
    return;
  }

  const dots: HTMLElement[] = [];
  if (scrub && scrubFill) {
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('div');
      dot.className = 'scrub-dot';
      dot.style.top = `${(i / (total - 1)) * 100}%`;
      scrub.appendChild(dot);
      dots.push(dot);
    }
  }

  ScrollTrigger.create({
    trigger: stage as gsap.DOMTarget,
    start: 'top top',
    end: () => {
      const stageEl = stage as HTMLElement;
      const sticky = stage.querySelector('.psych-sticky') as HTMLElement | null;
      return `+=${stageEl.offsetHeight - (sticky?.offsetHeight ?? 0)}`;
    },
    scrub: 1,
    snap: {
      snapTo: 1 / (total - 1),
      duration: 0.4,
      ease: 'power2.out',
    },
    invalidateOnRefresh: true,
    onUpdate(self) {
      const raw = self.progress * (total - 1);
      const idx = Math.round(raw);
      const floor = Math.floor(raw);
      const frac = raw - floor;
      const next = Math.min(floor + 1, total - 1);

      if (idx !== currentIndex) {
        currentIndex = idx;
        const d = psychData[idx];
        gsap.killTweensOf([nameEl, descEl]);
        gsap.to(nameEl, { text: { value: d.name, type: 'diff' }, duration: 0.35, ease: 'power2.out' });
        gsap.to(descEl, { text: { value: d.desc, type: 'diff' }, duration: 0.45, ease: 'power2.out' });
      }

      const lerped = lerpColor(psychData[floor].color, psychData[next].color, frac);
      panel.style.setProperty('--psych-color', lerped);

      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === idx);
      });
      if (scrubFill) {
        const pct = (raw / (total - 1)) * 100;
        scrubFill.style.height = `${Math.min(pct, 100)}%`;
        scrubFill.style.setProperty('background', lerped);
      }
    },
  });
}
