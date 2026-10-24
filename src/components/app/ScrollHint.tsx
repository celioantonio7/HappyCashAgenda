import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { ArrowDown } from '@/components/animated-icons';

export function ScrollHint({ container }: { container: RefObject<HTMLElement> }) {
  const target = useRef<HTMLElement | null>(null);
  const [region, setRegion] = useState<HTMLElement | null>(null);
  const [direction, setDirection] = useState<'down' | 'up' | null>(null);
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    let frame = 0;
    const isScrollable = (el: HTMLElement) => el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 3 && /auto|scroll/.test(getComputedStyle(el).overflowY);
    const refresh = () => {
      frame = 0;
      const candidates = [root, ...root.querySelectorAll<HTMLElement>('[data-scroll-region], [role="tabpanel"], section[aria-label], .booking-step-card, .client-agenda-panel, .overflow-y-auto')].filter(isScrollable);
      if (!target.current || !candidates.includes(target.current)) target.current = candidates.at(-1) ?? null;
      const el = target.current;
      setRegion(el);
      setDirection(el ? (el.scrollTop + el.clientHeight >= el.scrollHeight - 4 ? 'up' : 'down') : null);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(refresh); };
    const onScroll = (event: Event) => {
      if (event.target instanceof HTMLElement && root.contains(event.target) && isScrollable(event.target)) target.current = event.target;
      schedule();
    };
    const resize = new ResizeObserver(schedule);
    const observe = () => {
      resize.disconnect();
      resize.observe(root);
      root.querySelectorAll<HTMLElement>('[data-scroll-region], [role="tabpanel"], .booking-step-card, .client-agenda-panel, .overflow-y-auto').forEach(el => resize.observe(el));
      if (root.firstElementChild) resize.observe(root.firstElementChild);
      schedule();
    };
    const mutation = new MutationObserver(observe);
    mutation.observe(root, { childList: true, subtree: true });
    root.addEventListener('scroll', onScroll, true);
    root.addEventListener('load', schedule, true);
    window.addEventListener('resize', schedule);
    observe();
    return () => { cancelAnimationFrame(frame); resize.disconnect(); mutation.disconnect(); root.removeEventListener('scroll', onScroll, true); root.removeEventListener('load', schedule, true); window.removeEventListener('resize', schedule); };
  }, [container]);
  if (!direction || !region) return null;
  const label = direction === 'up' ? 'Rolar para cima' : 'Rolar para baixo';
  return createPortal(<button type="button" className="app-scroll-hint" aria-label={label} title={label} onClick={() => { const el = target.current; if (el) el.scrollBy({ top: (direction === 'up' ? -1 : 1) * el.clientHeight * .8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }}><ArrowDown className={`h-5 w-5 ${direction === 'up' ? 'rotate-180' : ''}`} aria-hidden="true" /></button>, region);
}
