import { removeNativePushForSession } from "@/hooks/useNativePush";
import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { User, ShieldCheck, LogOut, Phone, ArrowUpRight, ShoppingBag, MapPin, ImagePlus } from '@/components/animated-icons';
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
import { prepareProfileImage } from '@/lib/profileImage';
const emptyAddress = { street:'', number:'', complement:'', neighborhood:'', city:'', state:'', postalCode:'' };
type Address = typeof emptyAddress;
export default function Perfil() {
  const { user, loading, isAdmin, isStaff, signOut } = useAuth();
  const {settings} = useAgendaBranding(); const {toast} = useToast();
  const [name,setName] = useState(''); const [phone,setPhone] = useState(''); const [avatar,setAvatar] = useState<string|null>(null);
  const [address,setAddress] = useState<Address>(emptyAddress);
  const [dialog,setDialog] = useState<'personal'|'password'|'about'|null>(null);
  const [busy,setBusy] = useState(false); const [preparing,setPreparing] = useState(false);
  const [password,setPassword] = useState(''); const [confirmation,setConfirmation] = useState('');
  const [saved,setSaved] = useState({name:'',phone:'',avatar:null as string|null,address:emptyAddress});
  useEffect(() => {
    if (!user) return; let active=true;
    void supabase.from('profiles').select('full_name,phone,avatar_url').eq('user_id',user.id).maybeSingle().then(({data}) => {
      if(!active || !data)return;
      const stored=user.user_metadata?.personal_address;
      const nextAddress={...emptyAddress};
      if(stored && typeof stored==='object') for(const key of Object.keys(nextAddress) as (keyof Address)[]) if(typeof stored[key]==='string')nextAddress[key]=stored[key];
      setSaved({name:data.full_name,phone:data.phone||'',avatar:data.avatar_url,address:nextAddress});
      setName(data.full_name);setPhone(data.phone||'');setAvatar(data.avatar_url);setAddress(nextAddress);
    });
    return () => {active=false;};
  },[user]);
  if (!loading && !user) return <Navigate to={withAgendaPublicSearch('/login',settings)} replace />;
  const openPersonal=()=>{setName(saved.name);setPhone(saved.phone);setAvatar(saved.avatar);setAddress(saved.address);setDialog('personal');};
  const pickPhoto=async(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];event.target.value='';if(!file)return;setPreparing(true);
    try {setAvatar(await prepareProfileImage(file));}catch(error){toast({title:'Confira a foto',description:error instanceof Error?error.message:'Não foi possível abrir a imagem.',variant:'destructive'});}finally{setPreparing(false);}
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();if(!user || busy || preparing)return;setBusy(true);
    try {
      if(dialog==='password'){
        if(password!==confirmation || password.length<12)throw new Error('Use pelo menos 12 caracteres e repita a mesma senha.');
        const {error}=await supabase.auth.updateUser({password});if(error)throw error;
      }else{
        const digits=phone.replace(/\D/g,'');
        if(digits && (digits.length<10 || digits.length>15))throw new Error('Informe um telefone com DDD válido.');
        const normalized=Object.fromEntries(Object.entries(address).map(([key,value])=>[key,value.trim()])) as Address;
        // Keep image bytes in profiles, outside JWT claims. Personal metadata never grants access.
        const {error:metadataError}=await supabase.auth.updateUser({data:{full_name:name.trim(),phone:digits,avatar_url:avatar?.startsWith('data:')?'':avatar||'',personal_address:normalized}});
        if(metadataError)throw metadataError;
        const {error}=await supabase.from('profiles').update({full_name:name.trim(),phone:digits||null,avatar_url:avatar}).eq('user_id',user.id);
        if(error)throw error;
        setSaved({name:name.trim(),phone:digits,avatar,address:normalized});
      }
      toast({title:dialog==='password'?'Senha atualizada':'Dados atualizados'});setDialog(null);setPassword('');setConfirmation('');
    }catch(error){toast({title:'Não foi possível salvar',description:error instanceof Error?error.message:'Tente novamente.',variant:'destructive'});}finally{setBusy(false);}
  };
  const role=isAdmin?'Proprietário':isStaff?'Profissional':'Cliente';
  const addressSummary=[saved.address.street,saved.address.number,saved.address.city,saved.address.state].filter(Boolean).join(', ');
  return <Layout><div className="profile-page container px-4 py-6">
    <div className="page-intro"><div><h1>Meu <span className="text-primary">perfil.</span></h1><p>Dados pessoais e segurança da sua conta.</p></div></div>
    <div className="profile-layout">
      <section className="profile-summary" aria-label="Resumo da conta"><button className="profile-photo-button" onClick={openPersonal} aria-label="Alterar minha foto">{saved.avatar?<img src={saved.avatar} alt={saved.name}/>:<User aria-hidden="true"/>}<span><ImagePlus className="h-3.5 w-3.5" aria-hidden="true"/></span></button><div className="min-w-0"><h2 className="font-semibold text-lg break-words">{saved.name||'Sua conta'}</h2><p className="text-xs text-muted-foreground break-all mt-1">{user?.email}</p><span className="inline-block text-xs text-primary mt-2">{role}</span></div></section>
      <div className="profile-group">
        <button className="profile-row" onClick={openPersonal}><User/><span><strong>Informações pessoais</strong><small>Foto, nome e telefone{saved.phone?` · ${saved.phone}`:''}</small></span><ArrowUpRight className="ml-auto h-4 w-4"/></button>
        <button className="profile-row" onClick={openPersonal}><MapPin/><span className="min-w-0"><strong>Endereço</strong><small className="truncate">{addressSummary||'Rua, número, bairro e cidade'}</small></span><ArrowUpRight className="ml-auto h-4 w-4"/></button>
        <button className="profile-row" onClick={()=>setDialog('password')}><ShieldCheck/><span><strong>Segurança da conta</strong><small>Atualizar sua senha de acesso</small></span><ArrowUpRight className="ml-auto h-4 w-4"/></button>
        {!isAdmin && !isStaff && <Link className="profile-row" to={withAgendaPublicSearch('/produtos',settings)}><ShoppingBag/><span><strong>Loja da barbearia</strong><small>Produtos e cuidados</small></span><ArrowUpRight className="ml-auto h-4 w-4"/></Link>}
        <Link className="profile-row" to={withAgendaPublicSearch('/sobre', settings)}><User/><span><strong>Sobre a barbearia</strong><small>Informações e contato</small></span><ArrowUpRight className="ml-auto h-4 w-4"/></Link>
        {settings.whatsapp && <a className="profile-row" href={`https://wa.me/${settings.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"><Phone/><span><strong>Falar com a barbearia</strong><small>Ajuda com seu atendimento</small></span><ArrowUpRight className="ml-auto h-4 w-4"/></a>}
      </div>
    </div>
    {(isAdmin||isStaff) && <Link to={isAdmin?'/painel':'/painel-profissional'} className="profile-row mt-4 border border-border rounded-xl"><span><strong>{isAdmin?'Meu negócio':'Minha agenda'}</strong><small>Voltar ao painel</small></span><ArrowUpRight className="ml-auto"/></Link>}
    <button onClick={async()=>{await removeNativePushForSession(sessionStorage.getItem('barber_id') || undefined, sessionStorage.getItem('barber_session_token') || undefined).catch(() => {});for(const key of ['barber_id','barber_name','barber_session_token','barber_business_slug'])sessionStorage.removeItem(key);await signOut();}} className="profile-row text-destructive mt-4 rounded-xl border border-destructive/20 bg-destructive/5"><LogOut/><span><strong>Sair da conta</strong><small>Encerrar sua sessão neste dispositivo</small></span></button>
    <Dialog open={dialog!==null} onOpenChange={open=>{if(!open && !busy)setDialog(null);}}><DialogContent><DialogHeader><DialogTitle>{dialog==='about'?settings.displayName:dialog==='personal'?'Informações pessoais':'Alterar senha'}</DialogTitle><DialogDescription>{dialog==='about'?'Conheça a sua barbearia.':dialog==='personal'?'Atualize sua foto, contato e endereço.':'Escolha uma senha com pelo menos 12 caracteres.'}</DialogDescription></DialogHeader>
      {dialog==='about'?<div className="text-sm text-muted-foreground space-y-4"><p>{settings.aboutText||settings.tagline}</p>{settings.address&&<p>{settings.address}</p>}{settings.whatsapp&&<p>Contato: {settings.whatsapp}</p>}</div>:<form onSubmit={save} className="space-y-4">
        {dialog==='personal'?<>
          <div className="flex items-center gap-4">{avatar?<img src={avatar} alt="Prévia da sua foto" className="h-16 w-16 rounded-full object-cover"/>:<span className="brand-mark profile-avatar"><User/></span>}<div><Label htmlFor="profile-photo" className="inline-flex items-center min-h-11 cursor-pointer text-primary underline">{preparing?'Preparando foto…':'Escolher foto'}</Label><input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy||preparing} onChange={pickPhoto}/><p className="text-xs text-muted-foreground">JPG, PNG ou WebP, até 8 MB</p></div></div>
          <fieldset className="form-fields" disabled={busy}><legend>Contato</legend><div><Label htmlFor="profile-name">Nome</Label><Input id="profile-name" autoComplete="name" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={100} required/></div><div><Label htmlFor="profile-phone">Telefone com DDD</Label><Input id="profile-phone" type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={22}/></div></fieldset>
          <fieldset className="form-fields form-grid" disabled={busy}><legend>Endereço <span className="text-muted-foreground font-normal">(opcional)</span></legend>{([['postalCode','CEP','postal-code'],['street','Rua / avenida','address-line1'],['number','Número','off'],['complement','Complemento','address-line2'],['neighborhood','Bairro','off'],['city','Cidade','address-level2'],['state','Estado / UF','address-level1']] as const).map(([key,label,autocomplete])=><div key={key} className={key==='street'?'col-span-2':''}><Label htmlFor={`address-${key}`}>{label}</Label><Input id={`address-${key}`} value={address[key]} onChange={e=>setAddress({...address,[key]:e.target.value})} autoComplete={autocomplete} maxLength={key==='postalCode'?9:key==='state'?30:120}/></div>)}</fieldset>
        </>:<><Label htmlFor="new-password">Nova senha</Label><PasswordInput id="new-password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={12} required/><Label htmlFor="repeat-password">Repita a senha</Label><PasswordInput id="repeat-password" autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} minLength={12} required/></>}
        <div className="form-actions"><Button variant="outline" type="button" onClick={()=>setDialog(null)} disabled={busy}>Cancelar</Button><Button type="submit" disabled={busy||preparing}>{busy?'Salvando…':'Salvar alterações'}</Button></div>
      </form>}
    </DialogContent></Dialog>
  </div></Layout>;
}
