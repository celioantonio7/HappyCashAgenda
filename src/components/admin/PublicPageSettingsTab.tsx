import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAgendaBranding, type AgendaBrandingSettings } from '@/hooks/useAgendaBranding';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { BusinessQr } from '@/components/app/BusinessQr';
import { agendaPublicUrl, validGoogleReviewUrl } from '@/lib/agendaPublicUrl';
import { LoadingState } from '@/components/app/RingLoader';

export function PublicPageSettingsTab() {
  const { settings, loading, saveSettings } = useAgendaBranding();
  const [draft, setDraft] = useState(settings);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  useEffect(() => { if (!editing) setDraft(settings); }, [settings, editing]);
  const update = (patch: Partial<AgendaBrandingSettings>) => { setEditing(true); setDraft(current => ({ ...current, ...patch })); };
  const save = async () => {
    setSaving(true);
    try {
      const result = await saveSettings(draft);
      if (result.error) { toast({ title: 'Não foi possível salvar', description: result.error, variant: 'destructive' }); return; }
      setEditing(false); toast({ title: 'Configurações salvas', description: 'Link, contato e regras de atendimento atualizados.' });
    } catch { toast({ title: 'Não foi possível salvar', description: 'Confira sua conexão e tente novamente.', variant: 'destructive' }); }
    finally { setSaving(false); }
  };
  const publicUrl = agendaPublicUrl(settings.slug);
  const copy = async () => { try { await navigator.clipboard.writeText(publicUrl); toast({ title: 'Link copiado' }); } catch { toast({ title: 'Selecione e copie o endereço exibido', variant: 'destructive' }); } };
  const field = (key: keyof AgendaBrandingSettings, label: string, placeholder?: string) => <div className="space-y-2" key={key}><Label htmlFor={`setting-${key}`}>{label}</Label><Input id={`setting-${key}`} value={String(draft[key] ?? '')} placeholder={placeholder} onChange={event => update({ [key]: event.target.value })} /></div>;
  const toggle = (key: keyof AgendaBrandingSettings, label: string, disabled = false) => <div className="flex items-center justify-between gap-4 rounded-lg border p-3" key={key}><Label htmlFor={`setting-${key}`}>{label}</Label><Switch id={`setting-${key}`} checked={Boolean(draft[key])} disabled={disabled} onCheckedChange={checked => update({ [key]: checked })} /></div>;
  if (loading) return <LoadingState label="Carregando configurações…" />;
  return <Card><CardHeader><CardTitle>Agendamento e contato</CardTitle></CardHeader><CardContent className="space-y-5">
    <section className="rounded-xl border p-4 space-y-3"><h2 className="font-semibold">Link público</h2><a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm break-all">{publicUrl}</a><div className="flex flex-wrap gap-2"><Button onClick={() => void copy()} variant="outline">Copiar link</Button><Button asChild variant="outline"><a href={publicUrl} target="_blank" rel="noopener noreferrer">Abrir agendamento</a></Button><Button asChild variant="outline"><Link to={`/${settings.slug}/sobre`}>Sobre a barbearia</Link></Button></div><details><summary className="cursor-pointer py-2">QR Code de agendamento</summary><BusinessQr name={settings.displayName} value={publicUrl} kind="booking" /></details><details><summary className="cursor-pointer py-2">Alterar endereço</summary>{field('slug', 'Endereço da barbearia', 'minha-barbearia')}<p className="text-xs text-muted-foreground mt-2">Use letras minúsculas, números e hífens. Salve antes de compartilhar. Links antigos continuarão encaminhando para o novo endereço.</p></details></section>
    <details className="settings-disclosure" open><summary>Atendimento e fila</summary><div className="grid gap-3 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="service-mode">Como a barbearia atende</Label><select id="service-mode" className="w-full rounded-md border bg-background px-3 py-2" value={draft.serviceMode} onChange={event => update({ serviceMode: event.target.value as AgendaBrandingSettings['serviceMode'] })}><option value="appointment">Somente agendamento</option><option value="walk_in">Somente ordem de chegada</option><option value="both">Agendamento e ordem de chegada</option></select></div>{toggle('publicQueueVisible', 'Clientes logados podem ver a fila', draft.serviceMode === 'appointment')}{toggle('publicBookingEnabled', 'Link público habilitado')}</div><p className="text-xs text-muted-foreground mt-3">A fila mostra somente ordem de chegada de hoje. Horários futuros permanecem em Agendamentos.</p></details>
    <details className="settings-disclosure"><summary>Contato e redes sociais</summary><div className="grid gap-4 md:grid-cols-2">{field('address', 'Endereço')}{field('whatsapp', 'WhatsApp público', '5511999999999')}{field('adminWhatsapp', 'WhatsApp para avisos ao dono', '5511999999999')}{field('instagramUrl', 'Instagram', '@barbearia ou https://instagram.com/barbearia')}{field('facebookUrl', 'Facebook', 'https://facebook.com/barbearia')}</div></details>
    <details className="settings-disclosure"><summary>Avaliação no Google e placa para imprimir</summary><div className="space-y-4">{field('googleReviewUrl', 'Link de avaliação no Google', 'https://g.page/.../review')}<p className="text-sm text-muted-foreground">Cole o link de avaliação fornecido pelo Perfil da Empresa no Google. A placa fica disponível após salvar um link válido.</p>{settings.googleReviewUrl && validGoogleReviewUrl(settings.googleReviewUrl) ? <BusinessQr name={settings.displayName} value={settings.googleReviewUrl} kind="review" /> : <p className="text-sm">Nenhum link de avaliação cadastrado. Nenhuma placa de avaliação será gerada com um endereço inventado.</p>}</div></details>
    <details className="settings-disclosure"><summary>Regras de cancelamento e remarcação</summary><div className="grid gap-4 md:grid-cols-2">{(['rescheduleNoticeHours', 'cancellationNoticeHours'] as const).map(key => <div className="space-y-2" key={key}><Label htmlFor={key}>{key === 'rescheduleNoticeHours' ? 'Antecedência para remarcar (horas)' : 'Antecedência para cancelar (horas)'}</Label><Input id={key} type="number" min={0} max={72} value={draft[key]} onChange={event => update({ [key]: Math.max(0, Math.min(72, Number(event.target.value) || 0)) })} /><p className="text-xs text-muted-foreground">Zero permite a ação até antes do horário marcado.</p></div>)}</div></details>
    <details className="settings-disclosure"><summary>Lembretes e notificações</summary><div className="grid gap-3 md:grid-cols-2">{toggle('reminderEnabled', 'Enviar lembretes antes do atendimento')}{toggle('reminder24hEnabled', '24 horas antes', !draft.reminderEnabled)}{toggle('reminder2hEnabled', '2 horas antes', !draft.reminderEnabled)}{toggle('reminder30mEnabled', '30 minutos antes', !draft.reminderEnabled)}</div><p className="text-xs text-muted-foreground mt-3">Os lembretes são processados automaticamente. Cada pessoa precisa ativar as notificações neste aparelho. No iPhone, use o aplicativo instalado.</p><div className="grid gap-3 md:grid-cols-2 mt-4">{toggle('soundNotificationsEnabled', 'Sons enquanto o aplicativo está aberto')}{toggle('soundNewAppointmentEnabled', 'Novo agendamento', !draft.soundNotificationsEnabled)}{toggle('soundRescheduleEnabled', 'Remarcação', !draft.soundNotificationsEnabled)}{toggle('soundCancellationEnabled', 'Cancelamento', !draft.soundNotificationsEnabled)}{toggle('soundCompletionEnabled', 'Conclusão', !draft.soundNotificationsEnabled)}</div></details>
    <details className="settings-disclosure"><summary>Pagamento Pix</summary><div className="grid gap-3 md:grid-cols-2">{field('pixKey', 'Chave Pix')}{field('pixMerchantName', 'Nome do recebedor')}</div></details>
    <div className="form-actions"><Button onClick={() => void save()} disabled={saving || !editing}>{saving ? 'Salvando…' : 'Salvar configurações'}</Button></div>
  </CardContent></Card>;
}
