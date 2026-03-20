import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface WealthBreadcrumbProps {
  items: BreadcrumbItem[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WealthBreadcrumb({ items }: WealthBreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 text-sm">
        {items.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-1.5">
              {/* Separator */}
              {index > 0 && (
                <ChevronRight
                  className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0"
                  aria-hidden="true"
                />
              )}

              {/* Item */}
              {isLast ? (
                <span
                  className="font-semibold text-foreground truncate"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  to={item.href}
                  className={cn(
                    'inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors truncate',
                  )}
                >
                  {isFirst && <Home className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 text-muted-foreground truncate">
                  {isFirst && <Home className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
