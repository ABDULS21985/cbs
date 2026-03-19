import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Bell, User, LogOut, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function PortalLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/portal/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">B</span>
              </div>
              <span className="font-semibold text-sm hidden sm:block">BellBank</span>
            </Link>

            <div className="flex items-center gap-3">
              <button className="p-2 rounded-full hover:bg-muted relative">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted text-sm">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:block">{user?.firstName || 'User'}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-1 w-48 bg-card border rounded-lg shadow-lg py-1 z-50">
                    <Link to="/portal/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-muted">Profile</Link>
                    <Link to="/portal/accounts" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-muted">Accounts</Link>
                    <hr className="my-1" />
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm hover:bg-muted text-red-600 flex items-center gap-2">
                      <LogOut className="w-3 h-3" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
