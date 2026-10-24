import { useState } from 'react';
import { User, Briefcase } from '@/components/animated-icons';
import { supabase } from '@/integrations/supabase/client';
export function collectionPhotoUrl(store: string, kind: 'services' | 'clients', id: string, version?: string) {
  const { data } = supabase.storage.from('product-images').getPublicUrl(`${store}/${kind}/${id}.webp`);
  return version ? `${data.publicUrl}?v=${encodeURIComponent(version)}` : data.publicUrl;
}
export function CollectionPhoto({ store, kind, id, name, version }: { store: string; kind: 'services'|'clients'; id: string; name: string; version?: string }) {
  const src = collectionPhotoUrl(store,kind,id,version);
  const [failed,setFailed] = useState('');
  return <span className="collection-photo">{failed===src ? kind==='clients'?<User aria-hidden="true"/>:<Briefcase aria-hidden="true"/> : <img src={src} alt={name} loading="lazy" onError={()=>setFailed(src)}/>}</span>;
}
