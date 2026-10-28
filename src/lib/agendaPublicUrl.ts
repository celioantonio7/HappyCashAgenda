import { buildAgendaPublicHomePath } from './agendaPublicLink';

/** Includes the deployment directory (for example /HappyCashAgenda/). */
export function agendaAppUrl() {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  const url = configured ? new URL(configured) : new URL(import.meta.env.BASE_URL, origin);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Endereço público inválido.');
  return url.href.replace(/\/?$/, '/');
}

export function agendaPublicUrl(slug: string, suffix = '') {
  const path = buildAgendaPublicHomePath(slug);
  if (path.startsWith('/?')) return new URL(path.slice(1), agendaAppUrl()).href;
  return new URL(`${path.replace(/^\//, '')}${suffix}`, agendaAppUrl()).href;
}

export function validGoogleReviewUrl(value: string) {
  if (!value.trim()) return '';
  try {
    const url = new URL(value.trim());
    const hosts = ['google.com', 'google.com.br', 'g.page', 'maps.app.goo.gl'];
    return url.protocol === 'https:' && hosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`)) ? url.href : null;
  } catch { return null; }
}
