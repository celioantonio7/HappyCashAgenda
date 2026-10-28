import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { BusinessQr } from '@/components/app/BusinessQr';
import { useAgendaBranding } from '@/hooks/useAgendaBranding';
import { agendaPublicUrl, validGoogleReviewUrl } from '@/lib/agendaPublicUrl';
import { withAgendaPublicSearch } from '@/lib/agendaPublicLink';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

function socialUrl(value: string, host: string) {
  if (!value.trim()) return null;
  try {
    const url = new URL(value.includes('://') ? value : `https://${host}/${value.replace(/^@/, '')}`);
    return url.protocol === 'https:' && (url.hostname === host || url.hostname.endsWith(`.${host}`)) ? url.href : null;
  } catch { return null; }
}
export default function Sobre() {
  const { settings } = useAgendaBranding();
  const { toast } = useToast();
  const link = agendaPublicUrl(settings.slug);
  const reviews = validGoogleReviewUrl(settings.googleReviewUrl);
  const instagram = socialUrl(settings.instagramUrl, 'instagram.com');
  const facebook = socialUrl(settings.facebookUrl, 'facebook.com');
  const phone = settings.whatsapp.replace(/\D/g, '');
  const copy = async () => { try { await navigator.clipboard.writeText(link); toast({ title: 'Link copiado' }); } catch { toast({ title: 'Não foi possível copiar', description: 'Selecione e copie o endereço abaixo.', variant: 'destructive' }); } };
  return <Layout><div className="container py-6 space-y-6">
    <header className="flex items-center gap-4">{settings.logoUrl && <img src={settings.logoUrl} alt="" className="w-16 h-16 rounded-xl object-contain" />}<div><p className="page-eyebrow">Sobre a barbearia</p><h1>{settings.displayName}</h1><p className="text-muted-foreground text-sm mt-2">{settings.tagline}</p></div></header>
    {settings.aboutText && <p className="whitespace-pre-wrap text-sm">{settings.aboutText}</p>}
    {settings.address && <p><strong>Endereço:</strong> {settings.address}</p>}
    <div className="flex flex-wrap gap-3"><Button asChild><Link to={withAgendaPublicSearch('/agendamento', settings)}>Agendar horário</Link></Button>{settings.serviceMode !== 'appointment' && settings.publicQueueVisible && <Button asChild variant="outline"><Link to={withAgendaPublicSearch('/agendamento?modo=fila', settings)}>Ver fila</Link></Button>}{phone && <Button asChild variant="outline"><a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></Button>}{instagram && <Button asChild variant="outline"><a href={instagram} target="_blank" rel="noopener noreferrer">Instagram</a></Button>}{facebook && <Button asChild variant="outline"><a href={facebook} target="_blank" rel="noopener noreferrer">Facebook</a></Button>}</div>
    <section className="space-y-3 rounded-xl border border-border p-4"><h2 className="font-semibold">Link de agendamento</h2><p className="text-sm">Endereço da barbearia: <strong>/{settings.slug}</strong></p><a href={link} className="text-primary break-all text-sm">{link}</a><div><Button variant="outline" onClick={() => void copy()}>Copiar link</Button></div><BusinessQr name={settings.displayName} value={link} kind="booking" /></section>
    {reviews && <section className="space-y-3 rounded-xl border border-border p-4"><h2 className="font-semibold">Avalie sua experiência</h2><Button asChild variant="outline"><a href={reviews} target="_blank" rel="noopener noreferrer">Abrir avaliação no Google</a></Button><BusinessQr name={settings.displayName} value={reviews} kind="review" /></section>}
  </div></Layout>;
}
