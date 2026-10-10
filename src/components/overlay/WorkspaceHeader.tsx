'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function WorkspaceHeader({ title, description, Icon, children }: {
  title: ReactNode;
  description: string;
  Icon: LucideIcon;
  children?: ReactNode;
}) {
  return <header className="workspace-header">
    <span className="workspace-icon"><Icon size={24} strokeWidth={1.6} aria-hidden /></span>
    <div><h1>{title}</h1><p>{description}</p></div>
    {children && <div className="workspace-controls">{children}</div>}
  </header>;
}
