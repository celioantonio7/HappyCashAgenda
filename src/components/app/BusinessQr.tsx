import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';

type Props = { name: string; value: string; kind: 'booking' | 'review' };
export function BusinessQr({ name, value, kind }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const review = kind === 'review';
  const filename = `${review ? 'avaliacao-google' : 'agendamento'}-${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.svg`;
  const serialized = () => ref.current ? new XMLSerializer().serializeToString(ref.current) : '';
  const download = () => {
    const url = URL.createObjectURL(new Blob([serialized()], { type: 'image/svg+xml;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const print = () => {
    const popup = window.open('', '_blank', 'width=800,height=900');
    if (!popup) return;
    popup.opener = null;
    popup.document.write('<!doctype html><html><head><title>Placa da barbearia</title><style>@page{size:A4;margin:12mm}body{margin:0}svg{width:100%;height:auto;max-height:270mm}</style></head><body>' + serialized() + '</body></html>');
    popup.document.close(); popup.focus(); window.setTimeout(() => popup.print(), 300);
  };
  return <div className="space-y-3">
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" role="img" aria-label={review ? 'Placa para avaliação no Google' : 'QR Code para agendamento'} className="w-full max-w-xs border rounded-xl bg-white">
      <rect width="794" height="1123" fill="white" />
      <rect x="28" y="28" width="738" height="1067" rx="24" fill="none" stroke="#111827" strokeWidth="3" />
      <text x="397" y="135" textAnchor="middle" fill="#111827" fontSize="32" fontFamily="Arial,sans-serif" fontWeight="700">{name.length > 34 ? name.slice(0, 31) + '…' : name}</text>
      <text x="397" y="235" textAnchor="middle" fill="#111827" fontSize="36" fontFamily="Arial,sans-serif" fontWeight="700">{review ? 'Avalie no Google' : 'Agende seu horário'}</text>
      {review && <text x="397" y="305" textAnchor="middle" fill="#b7791f" fontSize="46" fontFamily="Arial,sans-serif">☆ ☆ ☆ ☆ ☆</text>}
      <g transform="translate(157, 355)"><QRCodeSVG value={value} size={480} level="M" marginSize={4} /></g>
      <text x="397" y="900" textAnchor="middle" fill="#111827" fontSize="25" fontFamily="Arial,sans-serif">Aponte a câmera do celular</text>
      <text x="397" y="945" textAnchor="middle" fill="#4b5563" fontSize="20" fontFamily="Arial,sans-serif">{review ? 'e conte como foi o atendimento.' : 'e escolha seu serviço e profissional.'}</text>
      {Array.from({ length: Math.ceil(value.length / 65) }, (_, i) => <text key={i} x="397" y={1005 + i * 18} textAnchor="middle" fill="#4b5563" fontSize="12" fontFamily="Arial,sans-serif">{value.slice(i * 65, (i + 1) * 65)}</text>)}
    </svg>
    <div className="flex flex-wrap gap-2"><Button onClick={download} variant="outline">{review ? 'Baixar placa de avaliação' : 'Baixar QR de agendamento'}</Button><Button onClick={print} variant="outline">Imprimir</Button></div>
  </div>;
}
