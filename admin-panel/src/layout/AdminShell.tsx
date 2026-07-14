import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import './AdminShell.css';

export function AdminShell() {
  const { pathname } = useLocation();
  const isDetailView = /^\/applications\/[^/]+$/.test(pathname);

  return (
    <div className="admin-shell">
      <div className="admin-shell__wash admin-shell__wash--teal" aria-hidden />
      <div className="admin-shell__wash admin-shell__wash--gold" aria-hidden />

      <div className="admin-shell__frame">
        <Sidebar />
        <main className="admin-shell__main">
          <div
            className={`admin-shell__card${isDetailView ? ' admin-shell__card--detail' : ''}`}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}