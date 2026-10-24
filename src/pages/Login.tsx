import { RingLoader as Loader2 } from '@/components/app/RingLoader';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Lock, Mail, ShieldCheck } from '@/components/animated-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AuthBackground } from '@/components/app/AuthBackground';
import { useAuth } from '@/hooks/useAuth';
import { useAgendaBranding } from '@/hooks/useAgendaBranding';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { readAgendaBookingDraft } from '@/lib/agendaBookingDraft';
import { withAgendaPublicSearch } from '@/lib/agendaPublicLink';

export default function Login() {
  const { user, isAdmin, isStaff, loading: authLoading, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const { settings } = useAgendaBranding();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(() => localStorage.getItem('happycash:agenda:keep-connected') === '1');
  const [forgot, setForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const clientTarget = readAgendaBookingDraft()?.returnPath || withAgendaPublicSearch('/agendamento', settings);
  useEffect(() => {
    if (!authLoading && user) {
      for (const key of ['barber_id','barber_name','barber_session_token','barber_business_slug']) sessionStorage.removeItem(key);
      navigate(isAdmin ? '/painel' : isStaff ? '/painel-profissional' : clientTarget, { replace: true });
    }
  }, [authLoading, user, isAdmin, isStaff, clientTarget, navigate]);
  const notifyError = (message: string) => toast({ title: 'Não foi possível continuar', description: message, variant: 'destructive' });

  // Compatibility for professional credentials already provisioned by the owner.
  // The RPC authenticates and identifies the professional; the form never chooses a role.
  const legacyStaffLogin = async (identifier: string) => {
    const { data, error } = await supabase.rpc('authenticate_barber', { p_username: identifier, p_password: password });
    const staff = data?.[0];
    if (error || !staff?.session_token) return false;
    const { data: professional } = await supabase.from('barbers').select('store_account_id').eq('id', staff.barber_id).maybeSingle();
    const { data: business } = professional?.store_account_id
      ? await supabase.from('agenda_business_settings').select('slug').eq('store_account_id', professional.store_account_id).maybeSingle()
      : { data: null };
    sessionStorage.setItem('barber_id', staff.barber_id);
    sessionStorage.setItem('barber_name', staff.barber_name);
    sessionStorage.setItem('barber_session_token', staff.session_token);
    if (business?.slug) sessionStorage.setItem('barber_business_slug', business.slug);
    else sessionStorage.removeItem('barber_business_slug');
    navigate(`/painel-profissional${business?.slug ? `?empresa=${encodeURIComponent(business.slug)}` : ''}`, { replace: true });
    return true;
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    localStorage.setItem('happycash:agenda:keep-connected', remember ? '1' : '0');
    try {
      const identifier = email.trim().toLowerCase();
      if (mode === 'signup') {
        if (password !== confirmation) { notifyError('As senhas não coincidem.'); return; }
        const { error, needsEmailConfirmation } = await signUp({ fullName: name.trim(), email: identifier, password, phone: phone.replace(/\D/g, '') });
        if (error) { notifyError(error.message); return; }
        toast({ title: needsEmailConfirmation ? 'Confirme seu e-mail' : 'Conta criada', description: needsEmailConfirmation ? 'Abra o link de confirmação para acessar sua agenda.' : 'Você já pode agendar seu horário.' });
        setMode('login'); setPassword(''); setConfirmation('');
      } else {
        if (!identifier.includes('@')) {
          if (!await legacyStaffLogin(email.trim())) notifyError('E-mail ou senha incorretos.');
          return;
        }
        const result = await signIn(identifier, password);
        if (result.error) {
          if (!await legacyStaffLogin(identifier)) notifyError('Confira seu e-mail e senha e tente novamente.');
          return;
        }
        navigate(result.isAdmin ? '/painel' : result.isStaff ? '/painel-profissional' : clientTarget, { replace: true });
      }
    } catch { notifyError('Não foi possível conectar. Verifique sua conexão e tente novamente.'); }
    finally { setBusy(false); }
  };
  const google = async () => {
    setBusy(true);
    localStorage.setItem('happycash:agenda:keep-connected', remember ? '1' : '0');
    const { error } = await signInWithGoogle();
    if (error) { notifyError(error.message); setBusy(false); }
  };
  const sendReset = async (event: FormEvent) => {
    event.preventDefault(); setResetBusy(true);
    try {
      const { error } = await resetPassword(resetEmail.trim().toLowerCase());
      if (error) { notifyError(error.message); return; }
      toast({ title: 'Verifique seu e-mail', description: 'Se houver uma conta com esse endereço, você receberá as instruções para recuperar sua senha.' });
      setForgot(false);
    } finally { setResetBusy(false); }
  };
  return <main className="auth-root">
    <AuthBackground />
    <div className="auth-panel">
      <section className="auth-card" aria-labelledby="auth-heading">
        <div className="auth-brand">
          <span className="brand-mark"><CalendarDays aria-hidden="true" className="h-7 w-7" /></span>
          <span className="auth-brand-name">{settings.storeAccountId ? settings.displayName : 'HappyCash Agenda'}</span>
          <span className="auth-brand-caption">Gestão e agendamento</span>
        </div>
        <h1 id="auth-heading">{mode === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta'}</h1>
        <p className="auth-description">{mode === 'login' ? 'Faça login para acessar sua conta' : 'Agende e acompanhe seus atendimentos.'}</p>
        <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
          {mode === 'signup' && <div className="auth-field"><Label htmlFor="account-name">Nome completo</Label><Input id="account-name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" minLength={2} required disabled={busy} /></div>}
          <div className="auth-field"><Label htmlFor="account-email">E-mail</Label><div className="auth-input-group"><Mail aria-hidden="true" className="auth-input-icon" /><Input id="account-email" type={mode === 'signup' ? 'email' : 'text'} inputMode="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com" autoComplete="username" autoCapitalize="none" spellCheck={false} required disabled={busy} /></div></div>
          {mode === 'signup' && <div className="auth-field"><Label htmlFor="account-phone">Telefone</Label><Input id="account-phone" type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" pattern="[0-9()+ −-]{10,22}" required disabled={busy} /></div>}
          <div className="auth-field"><Label htmlFor="account-password">Senha</Label><PasswordInput iconLeft={<Lock aria-hidden="true" className="h-4 w-4" />} id="account-password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : 1} required disabled={busy} placeholder="Sua senha" /></div>
          {mode === 'signup' && <div className="auth-field"><Label htmlFor="account-confirmation">Confirme a senha</Label><PasswordInput id="account-confirmation" value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="new-password" minLength={8} required disabled={busy} /></div>}
          <div className="auth-options"><div className="flex items-center gap-2"><Checkbox id="account-remember" checked={remember} onCheckedChange={value => setRemember(value === true)} /><Label htmlFor="account-remember" className="font-normal cursor-pointer">Lembrar de mim</Label></div>{mode === 'login' && <button type="button" className="auth-forgot" onClick={() => { setResetEmail(email); setForgot(true); }}>Esqueceu sua senha?</button>}</div>
          <Button type="submit" disabled={busy} className="auth-submit font-semibold text-[13px] px-4">{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar minha conta'}{busy ? <Loader2 className="h-6 w-6" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}</Button>
        </form>
        <div className="auth-divider">ou</div>
        <button className="auth-google" onClick={google} disabled={busy} type="button"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M43.6 24.5c0-1.5-.1-3-.4-4.5H24v8.5h11a9.4 9.4 0 0 1-4.1 6.2v5.2h6.7c3.9-3.6 6-8.9 6-15.4Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.2c-1.8 1.2-4.1 1.9-6.8 1.9-5.3 0-9.9-3.6-11.5-8.4H5.6v5.4A20.4 20.4 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.5 27.4a12.3 12.3 0 0 1 0-6.8v-5.4H5.6a20.2 20.2 0 0 0 0 17.6l6.9-5.4Z"/><path fill="#EA4335" d="M24 12.2c3 0 5.6 1 7.7 3l5.8-5.8A19.5 19.5 0 0 0 24 4 20.4 20.4 0 0 0 5.6 15.2l6.9 5.4c1.6-4.8 6.2-8.4 11.5-8.4Z"/></svg>Entrar com Google</button>
        <p className="auth-secondary">{mode === 'login' ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}{' '}<button type="button" disabled={busy} className="font-medium underline underline-offset-4 py-2" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Criar conta' : 'Entrar'}</button></p>
      </section>
      <p className="flex justify-center items-center gap-2 text-[10px] text-muted-foreground mt-7"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />Seus dados estão protegidos</p>
    </div>
    <Dialog open={forgot} onOpenChange={setForgot}><DialogContent><DialogHeader><DialogTitle>Recuperar sua senha</DialogTitle><DialogDescription>Informe o e-mail da sua conta para receber as instruções.</DialogDescription></DialogHeader><form onSubmit={sendReset} className="space-y-4"><Label htmlFor="reset-email">E-mail</Label><Input id="reset-email" type="email" autoComplete="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required /><Button type="submit" disabled={resetBusy} className="w-full">{resetBusy ? 'Enviando…' : 'Enviar instruções'}</Button></form></DialogContent></Dialog>
  </main>;
}
