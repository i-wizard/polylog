import { House, Layers, Map as MapIcon, MessageCircle, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Today', Icon: House },
  { to: '/path', label: 'Path', Icon: MapIcon },
  { to: '/review', label: 'Review', Icon: Layers },
  { to: '/chat', label: 'Chat', Icon: MessageCircle },
  { to: '/settings', label: 'Settings', Icon: Settings },
];

/** Bottom navigation, placed within thumb reach on a phone. */
export function TabBar() {
  return (
    <nav className="tab-bar" aria-label="Main">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} end className={({ isActive }) => `tab-bar__item${isActive ? ' is-active' : ''}`}>
          <Icon size={22} aria-hidden />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
