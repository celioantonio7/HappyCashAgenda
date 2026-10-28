import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNativePush } from '@/hooks/useNativePush';

export function NativePushControl({ storeId, barberId, sessionToken }: { storeId?: string | null; barberId?: string | null; sessionToken?: string | null }) {
  const push = useNativePush(storeId, barberId, sessionToken);
  const [error, setError] = useState('');
  if (!push.configured) return null;
  if (!push.supported) return <p className="text-xs text-muted-foreground">Para receber avisos no iPhone, instale o aplicativo na tela de início e abra por ele.</p>;
  return <div className="space-y-2">
    <Button variant="outline" size="sm" disabled={push.busy} className="w-full" onClick={async () => {
      setError('');
      try { if (push.enabled) await push.disable(); else await push.enable(); }
      catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível alterar as notificações.'); }
    }}>{push.busy ? 'Aguarde…' : push.enabled ? 'Desativar avisos neste aparelho' : 'Receber avisos neste aparelho'}</Button>
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </div>;
}
