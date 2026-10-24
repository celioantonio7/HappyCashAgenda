import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
export function KpiNavCard({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return <Card className={className}><Link to={to} className="kpi-link">{children}</Link></Card>;
}
