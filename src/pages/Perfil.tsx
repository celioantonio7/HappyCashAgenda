import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { User, ShieldCheck, LogOut, Phone, ArrowUpRight, ShoppingBag } from '@/components/animated-icons';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useAgendaBranding } from '@/hooks/useAgendaBranding';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { withAgendaPublicSearch } from '@/lib/agendaPublicLink';
export default function Perfil() {
  const { user, loading, isAdmin, isStaff, signOut } = useAuth();
  const {settings} = useAgendaBranding(); const {toast} = useToast();
  const [name,setName] = useState(''); const [phone,setPhone] = useState(''); const [avatar,setAvatar] = useState<string|null>(null);
  const [dialog,setDialog] = useState<'personal'|'password'|'about'|null>(null); const [busy,setBusy] = useState(false); const [password,setPassword] = useState(''); const [confirmation,setConfirmation] = useState('');
  useEffect(() => { if (!user) return; let active=true; void supabase.from('profiles').select('full_name,phone,avatar_url').eq('user_id',user.id).maybeSingle().then(({data}) => {if(active && data) {setName(data.full_name); setPhone(data.phone || '');setAvatar(data.avatar_url);}}); return () => {active=false;}; },[user]);
  if (!loading && !user) return <Navigate to={withAgendaPublicSearch('/login',settings)} replace />;
  const save = async (event: FormEvent) => {
    event.preventDefault();if(!user) return;setBusy(true);
    try {
      if(dialog==='password' && (password!==confirmation || password.length<12)) {toast({title:'Confira a senha',description:'Use pelo menos 12 caracteres e repita a mesma senha.',variant:'destructive'});return;}
      const {error} = dialog==='personal' ? await supabase.from('profiles').update({full_name:name.trim(),phone:phone.replace(/\D/g,'')}).eq('user_id',user.id) : await supabase.auth.updateUser({password});
      if(error) {toast({title:'Não foi possível salvar',description:error.message,variant:'destructive'});return;}
      toast({title:dialog==='personal'?'Dados atualizados':'Senha atualizada'});setDialog(null);setPassword('');setConfirmation('');
    } finally {setBusy(false);}
  };
  return <Layout><div className="container px-4 py-8"><div className="page-intro"><div><p className="page-eyebrow">Sua conta</p><h1>Meu <span className="text-primary">perfil.</span></h1><p>Seus dados e sua segurança.</p></div></div>
    <div className="flex items-center gap-5 p-6 mb-7 rounded-[20px] bg-card border border-border">{avatar?<img className="w-16 h-16 rounded-full object-cover" src={avatar} alt=""/>:<span className="brand-mark profile-avatar"><User className="h-7 w-7"/></span>}<div className="min-w-0"><h2 className="font-semibold text-xl truncate">{name || 'Sua conta'}</h2><p className="text-xs text-muted-foreground mt-1 break-all">{user?.email}</p><span className="inline-block text-[10px] text-primary mt-3">{isAdmin?'Proprietário':isStaff?'Profissional':'Cliente'}</span></div></div>
    <div className="profile-group"><a className="profile-row" href={withAgendaPublicSearch("/produtos",settings)}><ShoppingBag/><span><strong>Loja da barbearia</strong><small>Produtos e cuidados para sua rotina</small></span><ArrowUpRight className="ml-auto h-4 w-4"/></a><button className="profile-row" onClick={()=>setDialog("about")}><User/><span><strong>Sobre a barbearia</strong><small>Informações e contato</small></span><ArrowUpRight className="ml-auto h-4 w-4"/></button><button className="profile-row" onClick={()=>setDialog('personal')}><User/><span><strong>Informações pessoais</strong><small>Nome e telefone de contato</small></span><ArrowUpRight className="ml-auto h-4 w-4"/></button><button className="profile-row" onClick={()=>setDialog('password')}><ShieldCheck/><span><strong>Segurança da conta</strong><small>Atualizar sua senha de acesso</small></span><ArrowUpRight className="ml-auto h-4 w-4"/></button>{settings.whatsapp && <a className="profile-row" href={`https://wa.me/${settings.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"><Phone/><span><strong>Falar com a barbearia</strong><small>Ajuda com seu atendimento</small></span><ArrowUpRight className="ml-auto h-4 w-4"/></a>}</div>
    {isAdmin && <a href="/painel" className="profile-row mt-4 border border-border rounded-2xl"><span><strong>Meu negócio</strong><small>Abrir o painel administrativo</small></span><ArrowUpRight className="ml-auto"/></a>}
    <button onClick={signOut} className="profile-row text-destructive mt-6 rounded-2xl border border-destructive/20 bg-destructive/5"><LogOut/><span><strong>Sair da conta</strong><small>Encerrar sua sessão neste dispositivo</small></span></button>
    <Dialog open={dialog!==null} onOpenChange={open=>{if(!open)setDialog(null);}}><DialogContent><DialogHeader><DialogTitle>{dialog==='about'?settings.displayName:dialog==='personal'?'Informações pessoais':'Alterar senha'}</DialogTitle><DialogDescription>{dialog==='about'?'Conheça a sua barbearia.':dialog==='personal'?'Mantenha seus dados de contato atualizados.':'Escolha uma senha com pelo menos 12 caracteres.'}</DialogDescription></DialogHeader>{dialog==='about'?<div className="text-sm text-muted-foreground space-y-4"><p>{settings.aboutText || settings.tagline}</p>{settings.address && <p>{settings.address}</p>}{settings.whatsapp && <p>Contato: {settings.whatsapp}</p>}</div>:<form onSubmit={save} className="space-y-4">{dialog==='personal'?<><Label htmlFor="profile-name">Nome</Label><Input id="profile-name" autoComplete="name" value={name} onChange={e=>setName(e.target.value)} minLength={2} required/><Label htmlFor="profile-phone">Telefone</Label><Input id="profile-phone" type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} required/></>:<><Label htmlFor="new-password">Nova senha</Label><PasswordInput id="new-password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={12} required/><Label htmlFor="repeat-password">Repita a senha</Label><PasswordInput id="repeat-password" autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} minLength={12} required/></>}<Button className="w-full" type="submit" disabled={busy}>{busy?'Salvando…':'Salvar alterações'}</Button></form>}</DialogContent></Dialog>
  </div></Layout>;
}
