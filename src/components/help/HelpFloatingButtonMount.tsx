'use client';

import { usePathname } from 'next/navigation';
import { HelpFloatingButton } from '@/components/help/HelpFloatingButton';

export function HelpFloatingButtonMount() {
  const pathname = usePathname();

  if (!pathname) return null;
  if (pathname === '/login' || pathname === '/tienda/login') return null;

  return <HelpFloatingButton />;
}
