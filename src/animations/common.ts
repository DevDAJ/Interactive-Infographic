import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function bindScrollTriggerLayoutRefresh(): void {
  let t = 0;
  const schedule = (): void => {
    window.clearTimeout(t);
    t = window.setTimeout(() => ScrollTrigger.refresh(), 120);
  };
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(schedule).observe(document.body);
  } else {
    window.addEventListener('resize', schedule);
  }
  window.addEventListener('orientationchange', schedule);
  window.addEventListener('load', schedule, { once: true });
  document.fonts?.ready.then(schedule);
}
