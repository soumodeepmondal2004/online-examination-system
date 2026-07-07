import React, { useState, useEffect, createContext, useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, MessageSquare, Camera,
  LineChart, LogOut, User, School, AlertTriangle,
  Sun, Moon, ChevronRight, GraduationCap
} from 'lucide-react';

// ─── Theme Context (global dark/light mode) ──────────────────────────────
export const ThemeContext = createContext({ dark: false, toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('uni-theme');
    return saved ? saved === 'dark' : false; // Default: light mode
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('uni-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const toggle = () => setDark(p => !p);
  return <ThemeContext.Provider value={{ dark, toggle }}>{children}</ThemeContext.Provider>;
}

// ─── Layout ──────────────────────────────────────────────────────────────
export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Live clock — ticks every second
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!user) return <>{children}</>;

  const handleLogout = () => { logout(); navigate('/login'); };

  const getNavLinks = () => {
    const common = [{ path: `/${user.role}`, label: 'Dashboard', icon: LayoutDashboard }];
    if (user.role === 'student') return [
      ...common,
      { path: '/exams',          label: 'My Exams',        icon: BookOpen },
      { path: '/study-assistant', label: 'AI Assistant',    icon: MessageSquare },
      { path: '/attendance',      label: 'Face Attendance', icon: Camera },
      { path: '/prediction',      label: 'My Performance',  icon: LineChart },
    ];
    if (user.role === 'faculty') return [
      ...common,
      { path: '/exams',           label: 'Manage Exams',    icon: BookOpen },
      { path: '/attendance',      label: 'Attendance Logs', icon: Camera },
      { path: '/prediction',      label: 'Risk Analysis',   icon: LineChart },
      { path: '/proctoring-logs', label: 'Proctoring Logs', icon: AlertTriangle },
    ];
    return [
      ...common,
      { path: '/exams',      label: 'All Exams',       icon: BookOpen },
      { path: '/attendance', label: 'All Attendance',  icon: Camera },
      { path: '/prediction', label: 'System Analytics', icon: LineChart },
    ];
  };

  const links = getNavLinks();
  const pageLabel = location.pathname === `/${user.role}`
    ? 'Dashboard'
    : links.find(l => l.path !== `/${user.role}` && location.pathname.startsWith(l.path))?.label || 'SmartExam';

  const displayName = user.student?.full_name || user.teacher?.full_name || 'Administrator';
  const rollNumber  = user.student?.roll_number;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside style={{
        width: 248,
        flexShrink: 0,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-sm)',
        zIndex: 20,
      }}>

        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, var(--brand-800), var(--brand-600))',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <GraduationCap size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: "'Merriweather', Georgia, serif", fontSize: 15, fontWeight: 700, color: 'var(--brand-800)', lineHeight: 1.1 }}>
                SmartExam
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.04em' }}>
                University Portal
              </div>
            </div>
          </div>
        </div>

        {/* Role section label */}
        <div style={{ padding: '16px 20px 8px' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {user.role === 'student' ? 'Student Menu' : user.role === 'faculty' ? 'Faculty Menu' : 'Admin Menu'}
          </span>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto' }}>
          {links.map(link => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path ||
              (link.path !== `/${user.role}` && location.pathname.startsWith(link.path));
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 10,
                  marginBottom: 2,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 13.5,
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                  background: isActive ? 'var(--nav-active-bg)' : 'transparent',
                  color: isActive ? 'var(--nav-active-text)' : 'var(--text-secondary)',
                  borderLeft: isActive ? '3px solid var(--nav-active-bar)' : '3px solid transparent',
                  paddingLeft: isActive ? 9 : 12,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon size={15} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{link.label}</span>
                {isActive && <ChevronRight size={13} style={{ opacity: 0.5 }} />}
              </button>
            );
          })}
        </nav>

        {/* Bottom: user card */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10,
            background: 'var(--surface-2)',
            marginBottom: 6,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--brand-100), var(--accent-100))',
              border: '2px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <User size={15} color="var(--brand-700)" />
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {user.role}{rollNumber ? ` · ${rollNumber}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 8, border: 'none',
              background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 500, color: 'var(--danger-600)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-100)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <header style={{
          height: 58,
          background: 'var(--header-bg)',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', flexShrink: 0, zIndex: 10,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              {pageLabel}
            </h2>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--brand-700)', fontWeight: 600 }}>
                {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Role badge */}
            <span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>
              {user.role}
            </span>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              style={{
                width: 36, height: 36, borderRadius: 8,
                border: '1.5px solid var(--border)',
                background: 'var(--surface-2)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-500)'; e.currentTarget.style.color = 'var(--brand-600)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
