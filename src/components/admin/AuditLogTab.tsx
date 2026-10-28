import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

type AuditEntry = {
  id: string; actor_user_id: string | null; table_name: string; operation: string;
  before_data: Record<string, unknown> | null; after_data: Record<string, unknown> | null;
  changed_fields: string[]; created_at: string; reverts_audit_id: string | null; reason: string | null;
};
const names: Record<string, string> = {
  agenda_business_settings: 'Configurações da barbearia', appointments: 'Agendamento',
  appointment_services: 'Serviços do agendamento', services: 'Serviço', barbers: 'Profissional',
  agenda_clients: 'Cliente', business_hours: 'Horários de funcionamento', business_locations: 'Endereço', agenda_feed_posts: 'Publicação',
};
const fields: Record<string, string> = { status: 'Status', appointment_date: 'Data', appointment_time: 'Horário', price: 'Preço', name: 'Nome', display_name: 'Nome da barbearia', duration_minutes: 'Duração em minutos', slug: 'Endereço público', public_queue_visible: 'Fila pública', service_mode: 'Modo de atendimento', reminder_enabled: 'Lembretes', published: 'Publicado', title: 'Título', body: 'Texto', deleted_at: 'Arquivamento', open_time: 'Abertura', close_time: 'Fechamento', is_open: 'Dia aberto', pix_key: 'Chave Pix' };
const actions: Record<string, string> = { INSERT: 'Criação', UPDATE: 'Alteração', DELETE: 'Exclusão' };
const valueText = (value: unknown) => value == null ? 'Vazio' : typeof value === 'object' ? JSON.stringify(value) : String(value);

export function AuditLogTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [actorId, setActorId] = useState<string>();
  const { toast } = useToast();
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase.from('agenda_audit_log' as never).select('*').order('created_at', { ascending: false }).limit(100);
    setError(queryError ? 'Não foi possível carregar a auditoria. Verifique se a atualização do banco foi aplicada.' : '');
    setEntries((data || []) as unknown as AuditEntry[]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); void supabase.auth.getUser().then(({ data }) => setActorId(data.user?.id)); }, [load]);
  const revert = async () => {
    if (!selected) return;
    setSaving(true);
    const { error: revertError } = await supabase.rpc('agenda_revert_audit' as never, { p_audit_id: selected.id, p_reason: reason } as never);
    setSaving(false);
    if (revertError) {
      const description = revertError.code === '23P01' ? 'Este horário já está ocupado. A reversão não foi aplicada.' : revertError.code === '23505' ? 'Já existe um registro com estes dados. A reversão não foi aplicada.' : revertError.code === '23514' ? 'Os valores anteriores não atendem às regras atuais. A reversão não foi aplicada.' : revertError.code === 'P0001' ? revertError.message : 'Tente atualizar o histórico. Se continuar, revise o registro antes de tentar novamente.';
      toast({ title: 'Não foi possível reverter', description, variant: 'destructive' }); return;
    }
    if (selected.table_name === 'agenda_business_settings') window.dispatchEvent(new Event('agenda:settings-changed'));
    toast({ title: 'Alteração revertida', description: 'A reversão foi registrada na auditoria.' });
    setSelected(null); setReason(''); void load();
  };
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">Histórico de alterações</h2><p className="text-sm text-muted-foreground">Últimos 100 registros. O histórico começa após a ativação da auditoria.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}>Atualizar</Button></div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {loading ? <p>Carregando histórico…</p> : !error && entries.length === 0 ? <p>Nenhuma alteração registrada.</p> : entries.map(entry => {
      const alreadyReverted = entries.some(item => item.reverts_audit_id === entry.id);
      const canRevert = entry.operation === 'UPDATE' && !entry.reverts_audit_id && !alreadyReverted;
      return <Card key={entry.id}>
        <CardHeader><CardTitle className="text-base">{entry.reverts_audit_id ? 'Reversão' : actions[entry.operation]} · {names[entry.table_name] || entry.table_name}</CardTitle>
          <p className="text-sm text-muted-foreground">{new Date(entry.created_at).toLocaleString('pt-BR')} · {entry.actor_user_id === actorId ? 'Você' : entry.actor_user_id ? `Usuário ${entry.actor_user_id.slice(0, 8)}` : 'Sistema'}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <details><summary className="cursor-pointer text-sm">Ver campos alterados</summary><dl className="mt-3 space-y-3">
            {entry.changed_fields.filter(field => !['id', 'owner_user_id', 'store_account_id', 'created_at', 'updated_at'].includes(field)).map(field => <div key={field} className="min-w-0 text-sm"><dt className="font-medium break-all">{fields[field] || field}</dt><dd className="break-words text-muted-foreground">Antes: {valueText(entry.before_data?.[field])}</dd><dd className="break-words">Depois: {valueText(entry.after_data?.[field])}</dd></div>)}
          </dl></details>
          {entry.reason && <p className="text-sm break-words">Motivo: {entry.reason}</p>}
          {canRevert ? <Button size="sm" variant="outline" onClick={() => { setSelected(entry); setReason(''); }}>Reverter alteração</Button> : <p className="text-xs text-muted-foreground">{alreadyReverted ? 'Alteração já revertida.' : entry.reverts_audit_id ? 'Reversões não podem ser desfeitas automaticamente.' : 'Criações e exclusões exigem correção manual para preservar vínculos.'}</p>}
        </CardContent>
      </Card>;
    })}
    <Dialog open={!!selected} onOpenChange={open => { if (!saving && !open) setSelected(null); }}><DialogContent><DialogHeader><DialogTitle>Reverter alteração?</DialogTitle><DialogDescription>Os campos voltarão aos valores anteriores. A operação será bloqueada se o registro mudou depois ou se houver conflito com as regras de agendamento. A reversão também ficará registrada.</DialogDescription></DialogHeader>
      <label htmlFor="audit-reason" className="text-sm">Motivo da reversão</label><Input id="audit-reason" value={reason} onChange={event => setReason(event.target.value)} maxLength={500} placeholder="Explique por que deseja reverter" />
      <DialogFooter><Button variant="outline" disabled={saving} onClick={() => setSelected(null)}>Cancelar</Button><Button disabled={saving || reason.trim().length < 5} onClick={() => void revert()}>{saving ? 'Revertendo…' : 'Confirmar reversão'}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}
