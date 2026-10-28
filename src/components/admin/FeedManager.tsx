import { useCallback, useEffect, useRef, useState } from 'react';
import { useAgendaBranding } from '@/hooks/useAgendaBranding';
import { useAuth } from '@/hooks/useAuth';
import { feedClient, type FeedPost } from '@/integrations/supabase/feedClient';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ImagePlus, Plus } from 'lucide-react';
import { toast } from 'sonner';

export function FeedManager() {
 const { settings } = useAgendaBranding();
 const { user, isAdmin } = useAuth();
 if (!isAdmin || !user || !settings.storeAccountId) return <p>Selecione sua barbearia para gerenciar publicações.</p>;
 return <StoreFeedManager key={`${user.id}:${settings.storeAccountId}`} store={settings.storeAccountId} owner={user.id} name={settings.displayName} />;
}

function StoreFeedManager({ store, owner, name }: { store: string; owner: string; name: string }) {
 const [posts, setPosts] = useState<FeedPost[]>([]);
 const [composer, setComposer] = useState(false);
 const [editing, setEditing] = useState<FeedPost | null>(null);
 const [caption, setCaption] = useState('');
 const [file, setFile] = useState<File | null>(null);
 const [localPreview, setLocalPreview] = useState('');
 const [imageUrl, setImageUrl] = useState('');
 const [busy, setBusy] = useState(false);
 const [phase, setPhase] = useState('');
 const [error, setError] = useState('');
 const [loadError, setLoadError] = useState(false);
 const [loading, setLoading] = useState(true);
 const fileInput = useRef<HTMLInputElement>(null);
 const saving = useRef(false);
 const sequence = useRef(0);
 const alive = useRef(true);
 useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
 const load = useCallback(async () => {
  const current = ++sequence.current;
  const { data, error: requestError } = await feedClient.from('agenda_feed_posts').select('*').eq('store_account_id', store).is('deleted_at', null).order('created_at', { ascending: false }).limit(100);
  if (!alive.current || current !== sequence.current) return;
  setLoadError(!!requestError); setPosts(data ?? []); setLoading(false);
 }, [store]);
 useEffect(() => { void load(); }, [load]);
 useEffect(() => {
  if (!file) { setLocalPreview(''); return; }
  const preview = URL.createObjectURL(file);
  setLocalPreview(preview);
  return () => URL.revokeObjectURL(preview);
 }, [file]);
 const start = (post: FeedPost | null = null) => {
  toast.dismiss('feed-publication');
  setEditing(post); setCaption(post?.body ?? ''); setFile(null);
  setImageUrl(post?.image_url ?? ''); setError(''); setComposer(true);
 };
 const choose = (selected?: File) => {
  if (!selected) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size > 5 * 1024 * 1024) {
   setError('Escolha uma foto JPG, PNG ou WebP de até 5 MB.'); return;
  }
  setFile(selected); setImageUrl(''); setError('');
 };
 const save = async (event: React.FormEvent) => {
  event.preventDefault();
  if (saving.current) return;
  if (!file && !imageUrl) { setError('Escolha uma foto para publicar.'); return; }
  saving.current = true; setBusy(true); setError('');
  try {
   let uploadedUrl = imageUrl;
   if (file && !uploadedUrl) {
    setPhase('Enviando foto…');
    const path = `${store}/${crypto.randomUUID()}.${file.type.split('/')[1]}`;
    const { error: uploadError } = await supabase.storage.from('agenda-feed').upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) throw new Error('Não foi possível enviar a foto. Tente novamente.');
    uploadedUrl = supabase.storage.from('agenda-feed').getPublicUrl(path).data.publicUrl;
    if (!alive.current) return;
    // Reuse the uploaded photo if saving the post fails and the owner retries.
    setImageUrl(uploadedUrl);
   }
   if (!alive.current) return;
   setPhase(editing ? 'Salvando…' : 'Publicando…');
   const body = caption.trim();
   const values = {
    image_url: uploadedUrl, body,
    title: editing?.title ?? (body.split('\n')[0].slice(0, 120) || `Foto de ${name}`.slice(0, 120)),
    category: editing?.category ?? 'Novidades', published: true, updated_at: new Date().toISOString(),
   };
   const result = editing
    ? await feedClient.from('agenda_feed_posts').update(values).eq('id', editing.id).eq('store_account_id', store).select('id').single()
    : await feedClient.from('agenda_feed_posts').insert({ ...values, store_account_id: store, owner_user_id: owner }).select('id').single();
   if (result.error) throw new Error('Não foi possível publicar. Sua foto e legenda foram mantidas para tentar novamente.');
   if (!alive.current) return;
   setComposer(false); setFile(null); setImageUrl(''); setCaption(''); setEditing(null);
   toast.success('Publicação disponível no feed dos clientes.', { id: 'feed-publication' });
   await load();
  } catch (failure) {
   if (alive.current) setError(failure instanceof Error ? failure.message : 'Não foi possível publicar. Tente novamente.');
  } finally {
   saving.current = false;
   if (alive.current) { setBusy(false); setPhase(''); }
  }
 };
 const remove = async (post: FeedPost) => {
  if (!window.confirm('Remover esta publicação do feed? A ação pode ser revertida no histórico.')) return;
  if (saving.current) return;
  saving.current = true; setBusy(true);
  try {
   const { error: removeError } = await feedClient.from('agenda_feed_posts').update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', post.id).eq('store_account_id', store).select('id').single();
   if (removeError) throw removeError;
   if (!alive.current) return;
   toast.success('Publicação removida.', { id: 'feed-publication' }); await load();
  } catch { if (alive.current) toast.error('Não foi possível remover a publicação.'); }
  finally { saving.current = false; if (alive.current) setBusy(false); }
 };
 const preview = localPreview || imageUrl;
 return <section className="space-y-6">
  <header className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">Publicações</h2><p className="text-sm text-muted-foreground">Compartilhe fotos com os clientes da sua barbearia.</p></div><Button disabled={busy} onClick={() => start()}><Plus className="mr-2 h-4 w-4" aria-hidden="true" />Publicar</Button></header>
  <Dialog open={composer} onOpenChange={open => { if (!saving.current) { setComposer(open); if (!open) setFile(null); } }}>
   <DialogContent className="feed-composer gap-0 p-0 sm:p-0" onEscapeKeyDown={event => { if (saving.current) event.preventDefault(); }} onPointerDownOutside={event => event.preventDefault()}>
    <form onSubmit={save} className="feed-composer-form flex min-h-0 flex-col">
     <header className="shrink-0 border-b bg-background px-4 py-4 pr-14"><DialogTitle>{editing ? 'Editar publicação' : 'Nova publicação'}</DialogTitle><DialogDescription className="mt-1">Uma foto e uma legenda, se quiser.</DialogDescription></header>
     <div className="min-h-0 overflow-y-auto space-y-4 p-4">
      <input ref={fileInput} id="feed-photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} disabled={busy} onChange={event => { choose(event.target.files?.[0]); event.target.value = ''; }} />
      {preview ? <div className="space-y-2"><div className="overflow-hidden rounded-xl bg-muted"><img src={preview} alt="Prévia da publicação" className="feed-composer-photo mx-auto w-full object-contain" /></div><Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileInput.current?.click()}>Trocar foto</Button></div> : <button type="button" className="flex min-h-44 w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => fileInput.current?.click()}><ImagePlus className="h-10 w-10 text-primary" aria-hidden="true"/><span className="font-medium">Escolher foto</span><span className="text-xs text-muted-foreground">Câmera ou galeria · JPG, PNG ou WebP até 5 MB</span></button>}
      <div className="space-y-2"><Label htmlFor="feed-caption">Legenda <span className="text-muted-foreground font-normal">(opcional)</span></Label><Textarea id="feed-caption" placeholder="Conte a novidade…" rows={3} maxLength={5000} disabled={busy} value={caption} onChange={event => setCaption(event.target.value)} className="text-base" /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
     </div>
     <footer className="shrink-0 flex items-center gap-3 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><Button type="button" variant="outline" disabled={busy} onClick={() => { setComposer(false); setFile(null); }}>Cancelar</Button><Button type="submit" disabled={busy || !preview} className="flex-1">{busy ? phase : editing ? 'Salvar e publicar' : 'Publicar'}</Button></footer>
    </form>
   </DialogContent>
  </Dialog>
  {loading ? <p role="status">Carregando publicações…</p> : loadError ? <p role="alert">Não foi possível carregar as publicações. <button className="underline" onClick={() => void load()}>Tentar novamente</button></p> : posts.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center space-y-3"><ImagePlus className="h-10 w-10 mx-auto text-muted-foreground" aria-hidden="true"/><p>Seu feed está pronto para a primeira foto.</p><Button variant="outline" onClick={() => start()}>Criar publicação</Button></div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{posts.map(post => <article key={post.id} className="min-w-0 overflow-hidden rounded-xl border"><img src={post.image_url} alt="" loading="lazy" className="aspect-square w-full object-cover"/><div className="p-4 space-y-3"><div className="flex justify-between gap-2 text-xs text-muted-foreground"><span>{post.published ? 'Publicado' : 'Rascunho'}</span><time dateTime={post.created_at}>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(post.created_at))}</time></div><p className="line-clamp-3 whitespace-pre-wrap break-words text-sm">{post.body || post.title}</p><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={busy} onClick={() => start(post)}>Editar</Button><Button variant="outline" size="sm" disabled={busy} onClick={() => void remove(post)}>Remover</Button></div></div></article>)}</div>}
 </section>;
}
