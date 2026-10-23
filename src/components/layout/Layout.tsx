import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { CalendarDays, Menu, X, LogOut, User, ArrowUpRight } from '@/components/animated-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAgendaBranding } from '@/hooks/useAgendaBranding';
import { withAgendaPublicSearch } from '@/lib/agendaPublicLink';
import { isAgendaDemo } from '@/lib/agendaDemo';
import { clientNavigation, ownerGroups } from '@/components/app/navigation';

export function Layout({ children, showHeader = true }: { children: ReactNode; showHeader?: boolean }) {
  const { user, isAdmin, signOut } = useAuth();
  const { settings } = useAgendaBranding();
  const location = useLocation();
  const owner = isAdmin && ['/painel', '/admin'].includes(location.pathname);
  const staff = ['/painel-profissional','/painel-barbeiro','/professional'].includes(location.pathname);
  const [menu, setMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const tab = new URLSearchParams(location.search).get('tab') || 'overview';
  const activeArea = ownerGroups.flatMap(g => g.items).find(i => i.tab === tab)?.label || 'Visão geral';
  useEffect(() => { setMenu(false); }, [location.pathname, location.search]);
  const publicPath = (path: string) => withAgendaPublicSearch(path, settings);
  const brand = <><span className="brand-mark">{settings.logoUrl ? <img src={settings.logoUrl} alt="" /> : <CalendarDays className="h-4 w-4" aria-hidden="true" />}</span><span className="truncate">{settings.storeAccountId ? settings.displayName : 'HappyCash Agenda'}</span></>;
  return <div className={`app-frame ${owner ? 'owner-workspace' : staff ? 'staff-workspace' : ''} ${collapsed ? 'sidebar-collapsed' : ''}`}>
    {owner && <aside className="owner-sidebar" data-open={menu} aria-label="Navegação administrativa">
      <Link className="brand" to="/painel">{brand}</Link>
      {menu && <button className="icon-button absolute right-3 top-3 lg:hidden" onClick={() => setMenu(false)} aria-label="Fechar menu"><X /></button>}
      <nav>{ownerGroups.map(group => <div key={group.label}><h2>{group.label}</h2>{group.items.map(item => <Link key={item.tab} to={`/painel?tab=${item.tab}`} aria-current={tab === item.tab ? 'page' : undefined}><item.icon className="h-4 w-4" aria-hidden="true" /><span>{item.label}</span></Link>)}</div>)}</nav>
      <div className="sidebar-footer"><Link to={publicPath('/agendamento')}><ArrowUpRight className="h-4 w-4" aria-hidden="true" /><span>Ver página de agendamento</span></Link><button className="profile-row text-muted-foreground text-xs border-0 min-h-10" onClick={signOut}><LogOut className="h-4 w-4" aria-hidden="true" /><span>Sair da conta</span></button></div>
    </aside>}
    {showHeader && <header className="app-topbar">
      {owner ? <div className="flex items-center gap-3"><button className="icon-button owner-mobile-menu" onClick={() => setMenu(!menu)} aria-label="Abrir menu" aria-expanded={menu}><Menu /></button><button className="icon-button owner-collapse-menu" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expandir navegação' : 'Recolher navegação'}><Menu /></button><span className="text-xs text-muted-foreground">Meu negócio <span className="mx-2 text-border">/</span><span className="text-foreground">{activeArea}</span></span></div> : <Link className="brand min-w-0" to={staff ? location.pathname : publicPath('/agendamento')}>{brand}</Link>}
      <div className="app-topbar-actions"><time className="hidden sm:block text-[11px] text-muted-foreground" dateTime={new Date().toISOString().slice(0,10)}>{new Intl.DateTimeFormat('pt-BR',{day:'numeric',month:'long',timeZone:'America/Sao_Paulo'}).format(new Date())}</time>{staff ? <button className="icon-button" aria-label="Sair da conta" onClick={async () => { for (const k of ['barber_id','barber_name','barber_session_token','barber_business_slug']) sessionStorage.removeItem(k); await signOut(); window.location.assign('/login'); }}><LogOut /></button> : <Link className="icon-button" to={user ? publicPath('/perfil') : publicPath('/login')} aria-label={user ? 'Meu perfil' : 'Entrar na conta'}><User className="h-4 w-4" /></Link>}</div>
    </header>}
    <main className={`app-content ${!owner && !staff ? 'client-content' : ''}`}>
      {isAgendaDemo && <div className="offline-strip">Demonstração: dados fictícios, sem gravação no banco.</div>}
      {children}
    </main>
    {showHeader && !owner && !staff && <nav className="app-bottom-nav" aria-label="Navegação principal">{clientNavigation.map(item => <NavLink key={item.path} to={publicPath(item.path)}><item.icon className="h-5 w-5" aria-hidden="true" /><span>{item.label}</span></NavLink>)}</nav>}
  </div>;
}
