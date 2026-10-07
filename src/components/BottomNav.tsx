import { NavLink } from 'react-router-dom';
import { haptics } from '../services/haptics';
import { Icon } from './Icon';

const ITEMS = [
  { to: '/', label: 'Home', icon: 'dashboard' },
  { to: '/transactions', label: 'Transactions', icon: 'receipt_long' },
  { to: '/budget', label: 'Budget', icon: 'account_balance_wallet' },
];

const BASE = 'flex flex-col items-center justify-center min-w-[64px] min-h-[44px] py-1 transition-colors';

export function BottomNav() {
  return (
    <nav className="hide-on-keyboard fixed bottom-0 w-full z-50 pb-safe bg-surface/85 backdrop-blur-xl shadow-[0_-1px_12px_rgba(0,0,0,0.05)]">
      <div className="h-16 px-margin flex items-center justify-around">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            replace
            onClick={() => haptics.tap()}
            className={({ isActive }) => `${BASE} ${isActive ? 'text-primary font-title-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            <Icon name={item.icon} className="text-[24px]" />
            <span className="font-label-sm text-label-sm mt-0.5">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
