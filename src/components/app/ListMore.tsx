import { Button } from '@/components/ui/button';
export function ListMore({ total, shown, onMore }: { total: number; shown: number; onMore: () => void }) {
  if (total <= shown) return null;
  return <div className="list-more"><span role="status">{shown} de {total} registros</span><Button variant="outline" onClick={onMore}>Carregar mais</Button></div>;
}
