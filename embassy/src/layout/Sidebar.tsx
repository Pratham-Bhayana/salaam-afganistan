import { useEffect } from 'react';

import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { LogOut } from 'lucide-react';

import { embassyNav } from '../nav/embassyNav';

import { useAuth } from '../api/AuthContext';

import { embassyHasPermission } from '../api/client';

import { refreshUnreadCounts, resetUnreadState, useUnreadState } from './unreadStore';

import './Sidebar.css';



const POLL_MS = 30000;



function pageLabel(pathname: string): string {

  if (pathname === '/') {

    return embassyNav.find((item) => item.path === '/')?.label || 'Dashboard';

  }

  const match = embassyNav

    .filter((item) => item.path !== '/')

    .find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));

  return match?.label || 'Dashboard';

}



export function Sidebar() {

  const location = useLocation();

  const navigate = useNavigate();

  const { staff, embassy, logout, authenticated } = useAuth();

  const { chatUnread, notifUnread } = useUnreadState();



  useEffect(() => {

    if (!authenticated) {

      resetUnreadState();

      return;

    }



    void refreshUnreadCounts();

    const id = window.setInterval(() => void refreshUnreadCounts(), POLL_MS);

    return () => window.clearInterval(id);

  }, [authenticated]);



  useEffect(() => {

    if (authenticated) void refreshUnreadCounts();

  }, [location.pathname, authenticated]);



  const totalUnread = Math.max(chatUnread, notifUnread);



  useEffect(() => {

    const label = pageLabel(location.pathname);

    document.title =

      totalUnread > 0 ? `(${totalUnread > 99 ? '99+' : totalUnread}) ${label}` : label;

  }, [location.pathname, totalUnread]);



  const displayName = staff

    ? `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.email

    : 'Embassy Admin';

  const roleLabel = (staff?.role || 'embassy_staff').replaceAll('_', ' ');

  const embassyLabel =

    embassy?.code && embassy?.name

      ? `${embassy.name} (${embassy.code})`

      : embassy?.code || embassy?.name || 'Embassy';

  const initials = displayName

    .split(' ')

    .filter(Boolean)

    .map((p) => p[0])

    .join('')

    .slice(0, 2)

    .toUpperCase();



  return (

    <aside className="sidebar">

      <div className="sidebar__brand">

        <div className="sidebar__logos">

          <img src="/salaam-logo.png" alt="Salaam Afghanistan" className="sidebar__logo" />

          <span className="sidebar__logo-divider" aria-hidden />

          <img

            src="/Flag-Afghanistan.webp"

            alt="Afghanistan"

            className="sidebar__logo sidebar__logo--flag"

          />

        </div>

      </div>



      <nav className="sidebar__nav" aria-label="Embassy navigation">

        {embassyNav

          .filter((item) => !item.permission || embassyHasPermission(staff, item.permission))

          .map((item) => {

            const Icon = item.icon;

            const badge =

              item.id === 'chat' && chatUnread > 0

                ? chatUnread > 99

                  ? '99+'

                  : chatUnread

                : item.badge != null

                  ? item.badge

                  : null;



            if (!item.enabled) {

              return (

                <span

                  key={item.id}

                  className="sidebar__link sidebar__link--disabled"

                  aria-disabled="true"

                  title="Coming soon"

                >

                  <Icon size={18} strokeWidth={1.75} />

                  <span className="sidebar__label">{item.label}</span>

                  {badge != null ? <span className="sidebar__badge">{badge}</span> : null}

                  <span className="sidebar__soon">Soon</span>

                </span>

              );

            }



            return (

              <NavLink

                key={item.id}

                to={item.path}

                end={item.path === '/'}

                className={({ isActive }) =>

                  `sidebar__link${isActive ? ' sidebar__link--active' : ''}`

                }

              >

                {({ isActive }) => (

                  <>

                    <span

                      key={

                        isActive ? `liquid-${item.id}-${location.key}` : `liquid-${item.id}-idle`

                      }

                      className={`sidebar__liquid${isActive ? ' is-active' : ''}`}

                      aria-hidden

                    />

                    <Icon size={18} strokeWidth={1.75} className="sidebar__icon" />

                    <span className="sidebar__label">{item.label}</span>

                    {badge != null ? (

                      <span className="sidebar__badge" aria-label={`${badge} unread`}>

                        {badge}

                      </span>

                    ) : null}

                  </>

                )}

              </NavLink>

            );

          })}

      </nav>



      <div className="sidebar__profile">

        <div className="sidebar__avatar" aria-hidden>

          {initials || 'EA'}

        </div>

        <div className="sidebar__profile-meta">

          <strong>{displayName}</strong>

          <span>

            {roleLabel} · {embassyLabel}

          </span>

        </div>

        <button

          type="button"

          className="sidebar__logout"

          title="Sign out"

          aria-label="Sign out"

          onClick={() => {

            logout();

            navigate('/login');

          }}

        >

          <LogOut size={16} />

        </button>

      </div>

    </aside>

  );

}


