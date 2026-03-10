'use client';

import { useEffect, useState } from 'react';
import { BookOpen, ChevronLeft, CircleHelp } from 'lucide-react';
import { HelpPanel } from '@/components/help/HelpPanel';

const STORAGE_KEY = 'help_floating_collapsed';

export function HelpFloatingButton() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const value = window.localStorage.getItem(STORAGE_KEY);
    setCollapsed(value === '1');
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[80] flex items-center gap-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expandir ayuda' : 'Colapsar ayuda'}
          className="rounded-full border border-slate-300 bg-white/90 p-2 text-slate-600 shadow-lg transition hover:bg-white"
        >
          <ChevronLeft className={`h-4 w-4 transition ${collapsed ? 'rotate-180' : ''}`} />
        </button>

        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className={`group flex items-center gap-2 rounded-full border border-yellow-300 bg-gradient-to-r from-yellow-300 to-yellow-400 px-4 py-3 text-sm font-semibold text-slate-900 shadow-xl transition ${collapsed ? 'w-12 justify-center px-0' : ''}`}
        >
          <CircleHelp className="h-4 w-4 animate-pulse" />
          {!collapsed ? <span>¿Necesitas ayuda?</span> : null}
          {!collapsed ? <BookOpen className="h-4 w-4 opacity-70" /> : null}
        </button>
      </div>

      <HelpPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}
