import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Bell, LogOut, ChevronDown, Home, Landmark, ArrowLeftRight,
  CreditCard, MoreHorizontal, Users, Zap, Phone, FileText, HelpCircle,
  UserCircle, Moon, Sun, X, ChevronRight, ClipboardCheck, History,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { RouteContentLoader } from '@/components/layout/RouteContentLoader';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { portalApi } from '../api/portalApi';

const SIDEBAR_LINKS = [
  { path: '/portal/dashboard', label: 'Dashboard', icon: Home },
  { path: '/portal/accounts', label: 'Accounts', icon: Landmark },
  { path: '/portal/transfer', label: 'Transfers', icon: ArrowLeftRight },
  { path: '/portal/transfer-history', label: 'Transfer History', icon: History },
  { path: '/portal/beneficiaries', label: 'Beneficiaries', icon: Users },
  { path: '/portal/cards', label: 'Cards', icon: CreditCard },
  { path: '/portal/bills', label: 'Pay Bills', icon: Zap },
  { path: '/portal/airtime', label: 'Airtime', icon: Phone },
  { path: '/portal/requests', label: 'Requests', icon: FileText },
  { path: '/portal/profile', label: 'Profile', icon: UserCircle },
  { path: '/portal/help', label: 'Help', icon: HelpCircle },
];

const ADMIN_SIDEBAR_LINKS = [
  { path: '/portal/admin/profile-updates', label: 'Profile Reviews', icon: ClipboardCheck, roles: ['CBS_ADMIN', 'CBS_OFFICER'] },
];

const BOTTOM_NAV = [
  { path: '/portal/dashboard', label: 'Home', icon: Home },
  { path: '/portal/accounts', label: 'Accounts', icon: Landmark },
  { path: '/portal/transfer', label: 'Transfer', icon: ArrowLeftRight, center: true },
  { path: '/portal/cards', label: 'Cards', icon: CreditCard },
];

const SESSION_MS = 15 * 60 * 1000;
const WARN_MS = 2 * 60 * 1000;

export function PortalLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [remaining, setRemaining] = useState(SESSION_MS);
  const lastActivity = useRef(Date.now());

  const customerId = Number(user?.id) || 0;
  const { data: notifications = [] } = useQuery({
    queryKey: ['portal', 'notifications', customerId], queryFn: () => portalApi.getNotifications(customerId, 0, 5), enabled: customerId > 0, staleTime: 30_000,
  });
  const unreadCount = Array.isArray(notifications) ? notifications.filter((n: Record<string, unknown>) => !n.read).length : 0;

  const resetTimer = useCallback(() => { lastActivity.current = Date.now(); }, []);
  useEffect(() => {
    const evts = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    evts.forEach(e => window.addEventListener(e, resetTimer));
    const t = setInterval(() => {
      const r = Math.max(0, SESSION_MS - (Date.now() - lastActivity.current));
      setRemaining(r);
      if (r <= 0) { logout(); navigate('/login'); }
    }, 1000);
    return () => { evts.forEach(e => window.removeEventListener(e, resetTimer)); clearInterval(t); };
  }, [resetTimer, logout, navigate]);

  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode); }, [darkMode]);

  const pathSegs = location.pathname.split('/').filter(Boolean).slice(1);
  const showWarn = remaining <= WARN_MS && remaining > 0;

  return (
    <div className="min-h-screen bg-background">
      <a href="#portal-main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg">Skip to content</a>

      {showWarn && <div className="bg-amber-500 text-white text-center py-1.5 text-xs font-medium">Session expires in {Math.floor(remaining / 60000)}:{Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0')}</div>}

      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link to="/portal/dashboard" className="flex items-center gap-2" aria-label="BellBank Home">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><span className="text-primary-foreground font-bold text-sm">B</span></div>
                <span className="font-semibold text-sm hidden sm:block">BellBank</span>
              </Link>
              {pathSegs.length > 0 && (
                <nav className="hidden md:flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
                  {pathSegs.map((s, i) => (<span key={i} className="flex items-center gap-1"><ChevronRight className="w-3 h-3" /><span className={i === pathSegs.length - 1 ? 'text-foreground font-medium' : ''}>{s.charAt(0).toUpperCase() + s.slice(1)}</span></span>))}
                </nav>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link to="/portal/notifications" className="p-2 rounded-full hover:bg-muted relative" aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}>
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">{unreadCount}</span>}
              </Link>
              <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-sm" aria-expanded={menuOpen}>
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">{(user?.fullName?.[0] || 'U').toUpperCase()}</div>
                  <span className="hidden sm:block text-xs">{user?.fullName?.split(' ')[0] || 'User'}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {menuOpen && (<><div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 w-52 bg-card border rounded-lg shadow-lg py-1 z-50" role="menu">
                    <Link to="/portal/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-muted" role="menuitem">Profile</Link>
                    <button onClick={() => { setDarkMode(!darkMode); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center gap-2" role="menuitem">
                      {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}{darkMode ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    <hr className="my-1" />
                    <button onClick={() => { logout(); navigate('/login'); }} className="w-full text-left px-4 py-2 text-sm hover:bg-muted text-red-600 flex items-center gap-2" role="menuitem"><LogOut className="w-3 h-3" /> Sign Out</button>
                  </div></>)}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        <aside className="hidden md:block w-56 shrink-0 border-r min-h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto" role="navigation" aria-label="Portal navigation">
          <nav className="py-4 px-3 space-y-1">
            {SIDEBAR_LINKS.map(l => (<NavLink key={l.path} to={l.path} end={l.path === '/portal/dashboard'}
              className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors', isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
              aria-current={location.pathname === l.path ? 'page' : undefined}><l.icon className="w-4 h-4" />{l.label}</NavLink>))}
            {ADMIN_SIDEBAR_LINKS.filter(l => l.roles.some(r => user?.roles?.includes(r))).length > 0 && (
              <>
                <div className="pt-3 pb-1 px-3"><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Admin</p></div>
                {ADMIN_SIDEBAR_LINKS.filter(l => l.roles.some(r => user?.roles?.includes(r))).map(l => (
                  <NavLink key={l.path} to={l.path}
                    className={({ isActive }) => cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors', isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
                    aria-current={location.pathname === l.path ? 'page' : undefined}><l.icon className="w-4 h-4" />{l.label}</NavLink>
                ))}
              </>
            )}
          </nav>
        </aside>
        <main id="portal-main" className="flex-1 min-w-0 px-4 py-6 pb-20 md:pb-6" role="main">
          <Suspense fallback={<RouteContentLoader />}><Outlet /></Suspense>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur" role="navigation" aria-label="Mobile navigation">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {BOTTOM_NAV.map(item => {
            const active = location.pathname === item.path;
            return (<NavLink key={item.path} to={item.path} className={cn('flex flex-col items-center gap-0.5 min-w-[48px] min-h-[44px] justify-center', active ? 'text-primary' : 'text-muted-foreground')}
              aria-current={active ? 'page' : undefined}>
              {item.center ? <div className="w-12 h-12 -mt-4 rounded-full bg-primary flex items-center justify-center shadow-lg"><item.icon className="w-5 h-5 text-primary-foreground" /></div> : <item.icon className="w-5 h-5" />}
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>);
          })}
          <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-0.5 min-w-[48px] min-h-[44px] justify-center text-muted-foreground"><MoreHorizontal className="w-5 h-5" /><span className="text-[10px] font-medium">More</span></button>
        </div>
      </nav>

      {moreOpen && (<div className="md:hidden fixed inset-0 z-50"><div className="absolute inset-0 bg-black/50" onClick={() => setMoreOpen(false)} />
        <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl p-6 space-y-2 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-sm">More</h3><button onClick={() => setMoreOpen(false)} className="p-1 rounded hover:bg-muted"><X className="w-5 h-5" /></button></div>
          {SIDEBAR_LINKS.filter(l => !BOTTOM_NAV.find(b => b.path === l.path)).map(l => (
            <NavLink key={l.path} to={l.path} onClick={() => setMoreOpen(false)} className={({ isActive }) => cn('flex items-center gap-3 px-4 py-3 rounded-lg text-sm', isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted')}>
              <l.icon className="w-5 h-5" />{l.label}</NavLink>))}
        </div></div>)}
    </div>
  );
}
