import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { FanFeed } from '@/components/app/FanFeed';
import { useAgendaBranding } from '@/hooks/useAgendaBranding';
import { feedClient, type FeedPost } from '@/integrations/supabase/feedClient';
import { Button } from '@/components/ui/button';

export default function Feed() {
 const { settings, loading } = useAgendaBranding();
 const [posts, setPosts] = useState<FeedPost[]>([]);
 const [pending, setPending] = useState(true);
 const [error, setError] = useState(false);
 const [retry, setRetry] = useState(0);
 useEffect(() => {
  let active = true;
  setPosts([]); setError(false); setPending(true);
  if (loading) return;
  if (!settings.storeAccountId) { setPending(false); return; }
  const load = async () => {
   const result = await feedClient.from('agenda_feed_posts').select('*').eq('store_account_id', settings.storeAccountId!).eq('published', true).is('deleted_at', null).order('created_at', { ascending: false }).limit(50);
   if (active) { setPosts(result.data ?? []); setError(!!result.error); setPending(false); }
  };
  void load();
  const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 30000);
  const refresh = () => { if (document.visibilityState === 'visible') void load(); };
  document.addEventListener('visibilitychange', refresh);
  return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
 }, [loading, settings.storeAccountId, retry]);
 return <Layout><div className="feed-preview"><header className="feed-heading"><p className="page-eyebrow">{settings.displayName}</p><h1>Novidades da <span className="text-primary">barbearia.</span></h1><p>Publicações e cuidados compartilhados pela equipe.</p></header>
  {pending ? <p role="status">Carregando publicações…</p> : error ? <div role="alert"><p>Não foi possível carregar o feed.</p><Button variant="outline" onClick={() => setRetry(value => value + 1)}>Tentar novamente</Button></div> : posts.length ? <FanFeed key={posts.map(post => post.id).join(',')} items={posts.map(post => ({ id: post.id, title: post.title, image: post.image_url, category: post.category, body: post.body }))}/> : <p className="text-center text-muted-foreground py-12">A barbearia ainda não publicou novidades.</p>}
 </div></Layout>;
}
