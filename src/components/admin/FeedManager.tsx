import { useCallback, useEffect, useState } from 'react';
import { useAgendaBranding } from '@/hooks/useAgendaBranding';
import { useAuth } from '@/hooks/useAuth';
import { feedClient, type FeedPost } from '@/integrations/supabase/feedClient';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const empty = { title: '', body: '', category: 'Novidades', image_url: '', published: false };
export function FeedManager() {
 const { settings } = useAgendaBranding();
 const { user, isAdmin } = useAuth();
 const [posts, setPosts] = useState<FeedPost[]>([]);
 const [draft, setDraft] = useState(empty);
 const [editing, setEditing] = useState<string | null>(null);
 const [busy, setBusy] = useState(false);
 const [loadError, setLoadError] = useState(false);
 const store = settings.storeAccountId;
 const load = useCallback(async () => {
  if (!store) return;
  const { data, error } = await feedClient.from('agenda_feed_posts').select('*').eq('store_account_id', store).is('deleted_at', null).order('created_at', { ascending: false }).limit(100);
  setLoadError(!!error); setPosts(data ?? []);
 }, [store]);
 useEffect(() => { setPosts([]); setEditing(null); setDraft(empty); void load(); }, [load]);
 if (!isAdmin || !user || !store) return <p>Selecione sua barbearia para gerenciar publicações.</p>;
 const save = async (event: React.FormEvent) => {
  event.preventDefault();
  if (!draft.image_url.startsWith('https://')) { toast.error('Adicione uma imagem antes de salvar.'); return; }
  setBusy(true);
  const values = { ...draft, title: draft.title.trim(), body: draft.body.trim(), category: draft.category.trim() || 'Novidades', updated_at: new Date().toISOString() };
  const { error } = editing
   ? await feedClient.from('agenda_feed_posts').update(values).eq('id', editing).eq('store_account_id', store)
   : await feedClient.from('agenda_feed_posts').insert({ ...values, store_account_id: store, owner_user_id: user.id });
  setBusy(false);
  if (error) { toast.error('Não foi possível salvar a publicação. Tente novamente.'); return; }
  toast.success(values.published ? 'Publicação disponível no feed.' : 'Rascunho salvo.');
  setDraft(empty); setEditing(null); await load();
 };
 const upload = async (file?: File) => {
  if (!file) return;
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { toast.error('Use JPG, PNG ou WebP de até 5 MB.'); return; }
  setBusy(true);
  const path = `${store}/${crypto.randomUUID()}.${file.type.split('/')[1]}`;
  const { error } = await supabase.storage.from('agenda-feed').upload(path, file, { upsert: false, contentType: file.type });
  setBusy(false);
  if (error) { toast.error('Não foi possível enviar a imagem.'); return; }
  setDraft(previous => ({ ...previous, image_url: supabase.storage.from('agenda-feed').getPublicUrl(path).data.publicUrl }));
 };
 const remove = async (post: FeedPost) => {
  if (!window.confirm(`Remover “${post.title}” do feed? A auditoria permite reverter esta ação.`)) return;
  setBusy(true);
  const { error } = await feedClient.from('agenda_feed_posts').update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', post.id).eq('store_account_id', store);
  setBusy(false);
  if (error) toast.error('Não foi possível remover a publicação.');
  else { toast.success('Publicação removida.'); if (editing === post.id) { setEditing(null); setDraft(empty); } await load(); }
 };
 return <section className="space-y-6"><header><h2 className="text-xl font-semibold">Publicações</h2><p className="text-sm text-muted-foreground">Fotos e novidades exibidas no feed desta barbearia.</p></header>
  <form onSubmit={save} className="rounded-xl border p-4 space-y-4">
   <h3 className="font-medium">{editing ? 'Editar publicação' : 'Nova publicação'}</h3>
   <div><Label htmlFor="post-title">Título</Label><Input id="post-title" required maxLength={120} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })}/></div>
   <div><Label htmlFor="post-category">Categoria</Label><Input id="post-category" required maxLength={40} value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}/></div>
   <div><Label htmlFor="post-body">Texto</Label><Textarea id="post-body" required maxLength={5000} rows={4} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })}/></div>
   <div><Label htmlFor="post-image">Foto (JPG, PNG ou WebP, até 5 MB)</Label><Input id="post-image" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => void upload(e.target.files?.[0])}/></div>
   {draft.image_url && <img src={draft.image_url} alt="Prévia da publicação" className="max-h-48 rounded-lg object-contain"/>}
   <label className="flex gap-2 items-center"><input type="checkbox" checked={draft.published} onChange={e => setDraft({ ...draft, published: e.target.checked })}/>Publicar no feed dos clientes</label>
   <div className="flex gap-2"><Button disabled={busy} type="submit">{busy ? 'Salvando…' : 'Salvar'}</Button>{editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setDraft(empty); }}>Cancelar edição</Button>}</div>
  </form>
  {loadError ? <p role="alert">Não foi possível carregar as publicações. <button className="underline" onClick={() => void load()}>Tentar novamente</button></p> : posts.length === 0 ? <p className="text-muted-foreground">Nenhuma publicação cadastrada.</p> : <div className="space-y-3">{posts.map(post => <article key={post.id} className="border rounded-xl p-4 flex gap-4 items-start"><img src={post.image_url} alt="" className="w-16 h-16 rounded object-cover"/><div className="min-w-0 flex-1"><h3 className="font-medium break-words">{post.title}</h3><p className="text-sm text-muted-foreground">{post.published ? 'Publicado' : 'Rascunho'}</p><div className="flex flex-wrap gap-2 mt-2"><Button variant="outline" size="sm" disabled={busy} onClick={() => { setEditing(post.id); setDraft({ title: post.title, body: post.body, category: post.category, image_url: post.image_url, published: post.published }); }}>Editar</Button><Button variant="outline" size="sm" disabled={busy} onClick={() => void remove(post)}>Remover</Button></div></div></article>)}</div>}
 </section>;
}
