import type { AgendaBrandingSettings } from '@/hooks/useAgendaBranding';

export const applyBrandingToDocument = (settings: AgendaBrandingSettings) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", settings.primaryHsl);
  const textColor = (hsl: string) => {
    const [h, s, l] = hsl.replace(/%/g, '').split(/\s+/).map(Number);
    const a = s / 100 * Math.min(l / 100, 1 - l / 100);
    const channel = (n: number) => { const k = (n + h / 30) % 12; const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
    const luminance = .2126 * channel(0) + .7152 * channel(8) + .0722 * channel(4);
    return luminance > .179 ? '100 30% 7%' : '0 0% 100%';
  };
  for (const key of ['--primary', '--ring', '--sidebar-primary', '--sidebar-ring']) root.style.setProperty(key, settings.primaryHsl);
  for (const key of ['--primary-foreground', '--sidebar-primary-foreground']) root.style.setProperty(key, textColor(settings.primaryHsl));
  root.style.setProperty('--accent', settings.accentHsl);
  root.style.setProperty('--accent-foreground', textColor(settings.accentHsl));
  for (const key of ['--chart-1', '--chart-primary', '--chart-positive']) root.style.setProperty(key, `hsl(${settings.primaryHsl})`);
  for (const key of ['--chart-2', '--chart-secondary']) root.style.setProperty(key, `hsl(${settings.accentHsl})`);
  
  root.style.setProperty("--brand-accent", settings.accentHsl);
  root.style.setProperty("--gold", settings.accentHsl);
  
};

