import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut } from 'lucide-react';
import { embassyNav } from '../nav/embassyNav';
import { useAuth } from '../api/AuthContext';
import './Sidebar.css';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { staff, embassy, logout } = useAuth();

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
        <div className="sidebar__mark" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <div className="sidebar__brand-text">
          <strong>Salaam</strong>
          <span>Embassy · {embassy?.code || 'DXB'}</span>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Embassy navigation">
        {embassyNav.map((item) => {
          const Icon = item.icon;

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
                {item.badge != null && <span className="sidebar__badge">{item.badge}</span>}
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
                    key={isActive ? `liquid-${item.id}-${location.key}` : `liquid-${item.id}-idle`}
                    className={`sidebar__liquid${isActive ? ' is-active' : ''}`}
                    aria-hidden
                  />
                  <Icon size={18} strokeWidth={1.75} className="sidebar__icon" />
                  <span className="sidebar__label">{item.label}</span>
                  {item.badge != null && <span className="sidebar__badge">{item.badge}</span>}
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
        <ChevronDown size={16} className="sidebar__profile-chevron" aria-hidden />
      </div>
    </aside>
  );
}
