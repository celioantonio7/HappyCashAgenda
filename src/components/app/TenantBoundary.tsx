import { type ReactNode, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAgendaBranding } from '@/hooks/useAgendaBranding';
import { resolveAgendaRequestedSlug, slugFromPathname } from '@/lib/agendaSlug';
import { LoadingState } from '@/components/app/RingLoader';

export function TenantBoundary({ children }: { children: ReactNode }) {
  const { settings, loading, error } = useAgendaBranding();
  const location = useLocation();
  const navigate = useNavigate();
  const requested = resolveAgendaRequestedSlug(location.pathname, location.search);
  useEffect(() => {
    if (loading || error || !requested || !settings.storeAccountId || requested === settings.slug) return;
    const suffix = slugFromPathname(location.pathname)
      ? location.pathname.replace(/^\/[^/]+/, '')
      : location.pathname === '/' ? '' : location.pathname;
    const query = new URLSearchParams(location.search);
    query.delete('empresa'); query.delete('agenda');
    navigate({ pathname: `/${settings.slug}${suffix}`, search: query.toString() }, { replace: true });
  }, [loading, error, requested, settings.storeAccountId, settings.slug, location.pathname, location.search, navigate]);
  if (loading) return <LoadingState fullScreen label="Abrindo a barbearia…" />;
  if (requested && error) return <main className="auth-root"><section className="auth-card max-w-md space-y-4"><h1>Confira o link da barbearia</h1><p>{error}</p><p className="text-sm text-muted-foreground">Peça o link ao estabelecimento. Nenhuma outra empresa foi aberta no lugar desta.</p><Link className="underline" to="/login">Voltar ao acesso</Link><button className="underline ml-4" onClick={() => window.location.reload()}>Tentar novamente</button></section></main>;
  return <>{children}</>;
}
