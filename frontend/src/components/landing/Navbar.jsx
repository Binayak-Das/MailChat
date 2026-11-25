import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MessageSquare,
  Menu,
  X,
  Sun,
  Moon,
  ChevronRight,
  ChevronDown,
  LogOut,
  Shield,
  User as UserIcon,
  LayoutDashboard
} from 'lucide-react';

export default function Navbar({
  isDark,
  setIsDark,
  onOpenAuthModal,
  currentUser,
  onLogout
}) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const navLinks = [
    { name: 'Features', href: '/#features', isInternal: false },
    { name: 'Terms of Service', href: '/terms', isInternal: true },
    { name: 'Privacy Policy', href: '/privacy', isInternal: true },
    { name: 'Cookie Policy', href: '/cookies', isInternal: true }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20 group-hover:bg-blue-700 transition-colors">
                <MessageSquare className="w-5 h-5 text-white fill-white/20" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                Mail<span className="text-blue-600 dark:text-blue-400">Chat</span>
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4 lg:gap-7">
            {navLinks.map((link) => (
              link.isInternal ? (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-xs lg:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {link.name}
                </Link>
              ) : (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-xs lg:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {link.name}
                </a>
              )
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800 cursor-pointer"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Theme Mode"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-blue-600" />
              )}
            </button>

            {currentUser ? (
              <div className="relative pl-2 border-l border-slate-200 dark:border-slate-800" ref={dropdownRef}>

                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200/80 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer select-none"
                  aria-expanded={userDropdownOpen}
                >
                  <div className={`w-8 h-8 rounded-xl text-white font-bold flex items-center justify-center text-xs shadow-xs ${currentUser.role === 'admin' ? 'bg-indigo-600' : currentUser.role === 'user' ? 'bg-blue-600' : 'bg-amber-500'
                    }`}>
                    {getInitials(currentUser.name)}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      {currentUser.name}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {currentUser.role === 'admin' ? (
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                          <Shield className="w-3.5 h-3.5" /> Admin
                        </span>
                      ) : currentUser.role === 'user' ? (
                        <span className="text-blue-600 dark:text-blue-400 flex items-center gap-0.5 font-medium">
                          <UserIcon className="w-3.5 h-3.5" /> Member
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ml-1 ${userDropdownOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                    }`} />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2.5 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 shadow-2xl shadow-slate-400/15 dark:shadow-slate-950/60 z-50 animate-in fade-in zoom-in-95 duration-150">

                    <div className="px-3.5 py-3 mb-1.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {currentUser.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {currentUser.email}
                      </p>
                      <div className="mt-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${currentUser.role === 'admin'
                            ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            : currentUser.role === 'user'
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}>
                          {currentUser.role === 'admin' ? 'Administrator' : currentUser.role === 'user' ? 'Member' : 'Pending Role'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        navigate(currentUser.role === 'admin' ? '/admin/users' : '/dashboard/inbox');
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 flex items-center gap-3 transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <LayoutDashboard className="w-4 h-4" />
                      </div>
                      <span>Dashboard</span>
                    </button>

                    <div className="my-1.5 border-t border-slate-100 dark:border-slate-800/80" />

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        if (onLogout) onLogout();
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-3 transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <span>Sign Out</span>
                    </button>

                  </div>
                )}

              </div>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuthModal('login')}
                  className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white px-3.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  Sign In
                </button>

                <button
                  onClick={() => onOpenAuthModal('register')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Get Started Free
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 pt-2 pb-6 space-y-2">
          {navLinks.map((link) => (
            link.isInternal ? (
              <Link
                key={link.name}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3.5 py-2.5 rounded-xl text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-blue-600 dark:hover:text-white cursor-pointer transition-colors"
              >
                {link.name}
              </Link>
            ) : (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3.5 py-2.5 rounded-xl text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-blue-600 dark:hover:text-white cursor-pointer transition-colors"
              >
                {link.name}
              </a>
            )
          ))}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            {currentUser ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg text-white font-bold flex items-center justify-center text-xs ${currentUser.role === 'admin' ? 'bg-indigo-600' : currentUser.role === 'user' ? 'bg-blue-600' : 'bg-amber-500'
                      }`}>
                      {getInitials(currentUser.name)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{currentUser.name}</div>
                      <div className="text-xs text-slate-500">{currentUser.email}</div>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${currentUser.role === 'admin' ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : currentUser.role === 'user' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    }`}>
                    {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'user' ? 'Member' : 'Pending'}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate(currentUser.role === 'admin' ? '/admin/users' : '/dashboard/inbox');
                  }}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuthModal('login');
                  }}
                  className="w-full text-center py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuthModal('register');
                  }}
                  className="w-full text-center py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  Get Started Free
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
