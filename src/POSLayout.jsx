import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  ArrowLeft,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from './AuthContext.jsx';
import './POSLayout.css';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/services', label: 'Services', icon: Package },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function POSLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="pos-layout">
      <button
        className="pos-menu-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle navigation menu"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`pos-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="pos-sidebar-header">
          <span className="pos-brand">OPEN DOORS<small>POS</small></span>
          <button
            className="pos-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="pos-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) => `pos-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="pos-sidebar-footer">
          <div className="pos-user-info">
            <span className="pos-user-email">{user?.email}</span>
          </div>
          <button className="pos-logout-btn" onClick={handleLogout}>
            <LogOut size={18} /> Log out
          </button>
        </div>
      </aside>

      <div className="pos-sidebar-overlay" onClick={() => setSidebarOpen(false)} />

      <main className="pos-main">
        <header className="pos-header">
          <button
            className="pos-back-btn"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="pos-header-title">
            <h1>{children.props?.title || 'Open Doors POS'}</h1>
          </div>
          <div className="pos-header-actions">
            <span className="pos-online-indicator">Online</span>
          </div>
        </header>

        <div className="pos-content">
          {children}
        </div>
      </main>
    </div>
  );
}
