import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Home, User, Settings, LogOut, Menu, X, 
  LayoutDashboard, FileText, Users, ChevronLeft, MessageCircle, CalendarDays, Mic
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SIDEBAR_KEY = 'bookify_sidebar';

const navItems = {
  user: [
    { icon: Home, label: 'Browse Services', path: '/dashboard/user' },
    { icon: Calendar, label: 'My Bookings', path: '/dashboard/user?tab=bookings' },
    { icon: MessageCircle, label: 'Chat Assistant', path: '/dashboard/user/chat' },
    { icon: Mic, label: 'Voice Assistant', path: '/dashboard/user/voice' },
  ],
  organizer: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard/organizer' },
    { icon: FileText, label: 'My Services', path: '/dashboard/organizer?tab=services' },
    { icon: CalendarDays, label: 'Calendar', path: '/dashboard/organizer?tab=calendar' },
  ],
  admin: [
    { icon: LayoutDashboard, label: 'Overview', path: '/dashboard/admin' },
    { icon: Users, label: 'Users', path: '/dashboard/admin?tab=users' },
    { icon: FileText, label: 'Services', path: '/dashboard/admin?tab=services' },
  ],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_KEY) === 'collapsed';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  if (!user) return null;

  const items = navItems[user.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const currentPath = location.pathname + location.search;

  const isItemActive = (itemPath: string) => {
    // Exact match for paths with query params
    if (itemPath.includes('?')) {
      return currentPath === itemPath;
    }
    // For paths without query params, check if it's an exact match and no query param in current
    return location.pathname === itemPath && !location.search;
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 256 }}
        className="hidden md:flex flex-col border-r border-border bg-card fixed h-screen z-30"
      >
        <div className="p-4 flex items-center justify-between border-b border-border h-16">
          <Link to="/" className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-xl font-bold gradient-text overflow-hidden whitespace-nowrap"
                >
                  Bookify
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        <nav className="flex-1 p-3 pt-4 space-y-2">
          {items.map((item) => {
            const isActive = isItemActive(item.path);
            return (
              <Link key={item.path} to={item.path}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon size={20} className="shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-sm font-medium whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "w-full justify-center",
              !collapsed && "justify-start px-3"
            )}
          >
            <motion.div
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronLeft size={18} />
            </motion.div>
            {!collapsed && <span className="ml-2 text-sm">Collapse</span>}
          </Button>
        </div>

        <div className="p-3 pt-0 border-t border-border mt-2 space-y-2">
          <Link to="/dashboard/profile">
            <div className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
              location.pathname === '/dashboard/profile' 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}>
              <User size={20} className="shrink-0" />
              {!collapsed && <span className="text-sm font-medium">Profile</span>}
            </div>
          </Link>
          <button onClick={handleLogout} className="w-full">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
              <LogOut size={20} className="shrink-0" />
              {!collapsed && <span className="text-sm font-medium">Logout</span>}
            </div>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className={cn("flex-1 flex flex-col", collapsed ? "md:ml-[72px]" : "md:ml-64")}>
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-20 bg-card border-b border-border p-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold gradient-text">Bookify</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </Button>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex sticky top-0 z-20 bg-card/80 backdrop-blur border-b border-border h-16 items-center justify-between px-6">
          <h1 className="text-lg font-semibold capitalize">
            {user.role} Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-muted flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium">{user.name}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-20">
          <div className="flex justify-around py-2">
            {items.map((item) => {
              const isActive = isItemActive(item.path);
              return (
                <Link key={item.path} to={item.path} className="flex-1">
                  <div className={cn(
                    "flex flex-col items-center py-2 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    <item.icon size={20} />
                    <span className="text-xs mt-1">{item.label.split(' ')[0]}</span>
                  </div>
                </Link>
              );
            })}
            <Link to="/dashboard/profile" className="flex-1">
              <div className={cn(
                "flex flex-col items-center py-2 transition-colors",
                location.pathname === '/dashboard/profile' ? "text-primary" : "text-muted-foreground"
              )}>
                <User size={20} />
                <span className="text-xs mt-1">Profile</span>
              </div>
            </Link>
          </div>
        </nav>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed right-0 top-0 bottom-0 w-72 bg-card border-l border-border z-50 md:hidden"
            >
              <div className="p-4 flex justify-between items-center border-b border-border">
                <span className="font-semibold">Menu</span>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                  <X size={20} />
                </Button>
              </div>
              <nav className="p-4 space-y-2">
                {items.map((item) => (
                  <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted">
                      <item.icon size={20} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                  </Link>
                ))}
                <hr className="my-4" />
                <Link to="/dashboard/profile" onClick={() => setMobileOpen(false)}>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted">
                    <User size={20} />
                    <span className="text-sm font-medium">Profile</span>
                  </div>
                </Link>
                <button onClick={handleLogout} className="w-full">
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-destructive/10 text-destructive">
                    <LogOut size={20} />
                    <span className="text-sm font-medium">Logout</span>
                  </div>
                </button>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
