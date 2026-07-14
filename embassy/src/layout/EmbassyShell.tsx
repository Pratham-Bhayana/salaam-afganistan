import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import './EmbassyShell.css';

export function EmbassyShell() {
  const { pathname } = useLocation();
  const isApplicationDetail = /^\/applications\/[^/]+$/.test(pathname);
  const isChat = pathname === '/chat' || pathname.startsWith('/chat/');

  const cardMods = [
    isApplicationDetail ? 'embassy-shell__card--detail' : '',
    isChat ? 'embassy-shell__card--chat' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="embassy-shell">
      <div className="embassy-shell__wash embassy-shell__wash--blue" aria-hidden />
      <div className="embassy-shell__wash embassy-shell__wash--copper" aria-hidden />

      <div className="embassy-shell__frame">
        <Sidebar />
        <main className="embassy-shell__main">
          <div className={`embassy-shell__card${cardMods ? ` ${cardMods}` : ''}`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
