import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';

import { navigationItems } from './navigation';

// Flatten nav items for search
const allItems = navigationItems.flatMap((section) =>
  section.items.flatMap((item) => {
    const parent = { label: item.label, path: item.path, section: section.title };
    const children = (item.children || []).map((c) => ({
      label: `${item.label} > ${c.label}`,
      path: c.path,
      section: section.title,
    }));
    return [parent, ...children];
  })
);

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery('');
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filtered = query.length > 0
    ? allItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
    : allItems.slice(0, 8);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setOpen(false)} />
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50">
        <div className="bg-popover border rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, customers, actions..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex text-xs bg-muted px-1.5 py-0.5 rounded font-mono">ESC</kbd>
          </div>
          <div className="max-h-80 overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No results found</p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setOpen(false); }}
                  className="flex items-center justify-between w-full px-4 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <div>
                    <span>{item.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{item.section}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
