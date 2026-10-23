import { FileText } from '@/components/animated-icons';
import type { ReactNode } from 'react';
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <section className="empty-panel"><FileText aria-hidden="true" /><h2 className="font-semibold text-sm">{title}</h2><p>{description}</p>{action && <div className="mt-6">{action}</div>}</section>;
}
