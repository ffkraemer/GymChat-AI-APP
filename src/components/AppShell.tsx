import type { ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import './AppShell.css';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

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
          <a className="shell__nav-item shell__nav-item--active" href="/faqs">
            FAQs
          </a>
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
