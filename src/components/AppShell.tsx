import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import './AppShell.css';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isPlatformAdmin = user?.roles.includes('PlatformAdmin') ?? false;

  const navLinkClass = (path: string) =>
    `shell__nav-item${location.pathname === path ? ' shell__nav-item--active' : ''}`;

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="shell__brand">
          <span className="shell__brand-mark">GC</span>
          <div>
            <div className="shell__brand-name">GymChat AI</div>
            <div className="shell__brand-sub">Administração</div>
          </div>
        </div>

        <nav className="shell__nav">
          <a className={navLinkClass('/faqs')} href="/faqs">
            FAQs
          </a>
          <a className={navLinkClass('/class-types')} href="/class-types">
            Aulas
          </a>
          {isPlatformAdmin && (
            <a className={navLinkClass('/gyms')} href="/gyms">
              Gyms
            </a>
          )}
        </nav>

        <div className="shell__user">
          <div className="shell__user-name">{user?.fullName}</div>
          <div className="shell__user-email">{user?.email}</div>
          <button className="shell__logout" onClick={logout} type="button">
            Sair
          </button>
        </div>
      </aside>

      <main className="shell__main">{children}</main>
    </div>
  );
}
