import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Menu,
  X,
  ArrowUpRight,
  Truck,
  Sparkles,
  Clock3,
  Shirt,
  MapPin,
  Phone,
  Mail,
  Check,
  ChevronDown,
  ShieldCheck,
  PackageCheck,
  Leaf,
  Sun,
  Moon,
  WifiOff,
  RefreshCw,
  LogIn,
  Database,
  Wifi,
} from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import LoginPage from './LoginPage.jsx';
import MarketingLayout from './MarketingLayout.jsx';
import POSLayout from './POSLayout.jsx';
import BookingForm from './BookingForm.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import ReceiptPage from './ReceiptPage.jsx';
import FAQPage from './FAQPage.jsx';
import NotFound from './NotFound.jsx';
import OrdersPage from './OrdersPage.jsx';
import CustomersPage from './CustomersPage.jsx';
import PaymentsPage from './PaymentsPage.jsx';
import ReportsPage from './ReportsPage.jsx';
import SettingsPage from './SettingsPage.jsx';
import OfflinePOSPage from './OfflinePOSPage.jsx';
import HomePage from './HomePage.jsx';
import ServicesPage from './ServicesPage.jsx';
import ProcessPage from './ProcessPage.jsx';
import AboutPage from './AboutPage.jsx';
import ContactPage from './ContactPage.jsx';
import { useOffline } from './hooks/useOffline.js';
import './styles.css';

const services = [
  {
    icon: Sparkles,
    n: 'Wash & fold',
    d: 'Everyday laundry, expertly sorted, washed, dried and neatly folded.',
    p: 'From KSh 1,200 / load',
  },
  {
    icon: Shirt,
    n: 'Dry cleaning',
    d: 'Careful treatment for suits, dresses, delicate fabrics and special garments.',
    p: 'Priced per item',
  },
  {
    icon: Clock3,
    n: 'Ironing & steaming',
    d: 'Crisp, polished finishing for your wardrobe, uniforms and linens.',
    p: 'From KSh 700 / load',
  },
  {
    icon: Truck,
    n: 'Pickup & delivery',
    d: 'Door-to-door convenience across Kitengela, Kisaju, Isinya and Athi River.',
    p: 'Available daily',
  },
];

const defaultSteps = ['We collect', 'We sort', 'We clean', 'We finish', 'We deliver'];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function MobileDrawer() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    setOpen(false);
  }, [location]);

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/services', label: 'Services' },
    { path: '/process', label: 'Process' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' },
  ];

  return (
    <>
      <button
        className="menu-btn"
        onClick={() => setOpen(!open)}
        aria-label="Toggle navigation menu"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && (
        <>
          <div
            className="nav-drawer-overlay"
            onClick={() => setOpen(false)}
          />
          <nav className={`nav-drawer ${open ? 'open' : ''}`}>
            <button className="drawer-close" onClick={() => setOpen(false)} aria-label="Close menu">
              <X size={18} />
            </button>
            {navItems.map(({ path, label }) => (
              <a
                key={path}
                href={path}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(path);
                  setOpen(false);
                }}
                className={location.pathname === path ? 'active' : ''}
              >
                {label}
              </a>
            ))}
            {user ? (
              <a
                href="/dashboard"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/dashboard');
                  setOpen(false);
                }}
                className={location.pathname === '/dashboard' ? 'active' : ''}
              >
                Dashboard
              </a>
            ) : (
              <>
                <a
                   href="/login"
                   onClick={(e) => {
                     e.preventDefault();
                     navigate('/login');
                     setOpen(false);
                   }}
                   className={location.pathname === '/login' ? 'active' : ''}
                 >
                   <LogIn size={16} /> Sign in
                 </a>
                <a
                  href="/booking"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/booking');
                    setOpen(false);
                  }}
                  className={location.pathname === '/booking' ? 'active' : ''}
                >
                  Get Started
                </a>
              </>
            )}
          </nav>
        </>
      )}
    </>
  );
}

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('od-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });
  const [connectivity, setConnectivity] = useState(navigator.onLine ? 'online' : 'offline');
  const [syncing, setSyncing] = useState(false);
  const { pendingCount } = useOffline();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('od-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleOnline = () => {
      setConnectivity('online');
      setSyncing(true);
      setTimeout(() => setSyncing(false), 2000);
    };
    const handleOffline = () => setConnectivity('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleTheme = () => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  };

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/services', label: 'Services' },
    { path: '/process', label: 'Process' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' },
  ];

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="topbar">
        <span>Express wash in just 4 hours</span>
        <span>Chuna Mall · Shop 10 · Kitengela</span>
      </div>
      <header>
        <a className="brand" href="/">
          <span className="logo-crop">
            <img src="/assets/logo.jpg" alt="Open Doors POS logo" width="54" height="54" />
          </span>
          <span>
            OPEN DOORS<small>POS</small>
          </span>
        </a>
        <nav className={connectivity !== 'online' ? '' : ''}>
          {navItems.map(({ path, label }) => (
            <a
              key={path}
              href={path}
              onClick={(e) => {
                e.preventDefault();
                navigate(path);
              }}
              className={location.pathname === path ? 'active' : ''}
            >
              {label}
            </a>
          ))}
          {user ? (
            <>
              <a
                className="nav-cta"
                href="/dashboard"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/dashboard');
                }}
              >
                Dashboard
              </a>
              <a
                className="nav-cta"
                href="/offline-pos"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/offline-pos');
                }}
              >
                <Database size={16} /> Offline
              </a>
            </>
          ) : (
            <>
              <a
                className="nav-cta"
                href="/login"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/login');
                }}
              >
                <LogIn size={16} /> Sign in
              </a>
              <a
                className="nav-cta nav-cta-secondary"
                href="/booking"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/booking');
                }}
              >
                Get Started
              </a>
            </>
          )}
        </nav>
        <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <MobileDrawer />
      </header>
      {connectivity !== 'online' && (
        <div className={`connectivity-indicator ${connectivity}`}>
          {connectivity === 'offline' ? <WifiOff size={14} /> : <RefreshCw size={14} />}
          {' '}{syncing ? 'Syncing...' : connectivity === 'offline' ? 'Offline' : 'Back online'}
          {pendingCount > 0 && connectivity === 'online' && (
            <span> · {pendingCount} pending</span>
          )}
        </div>
      )}
      {syncing && (
        <div className="connectivity-indicator syncing" style={{ bottom: '60px' }}>
          <RefreshCw size={14} /> Syncing...
        </div>
      )}
    </>
  );
}

function Footer() {
  return (
    <footer>
      <div className="footer-main">
        <div className="footer-intro">
          <div className="brand footer-brand">
            <span className="logo-crop">
              <img src="/assets/logo.jpg" alt="Open Doors POS logo" width="42" height="42" />
            </span>
            <span>
              OPEN DOORS<small>POS</small>
            </span>
          </div>
          <p>
            Simple, powerful point-of-sale software designed for laundromats.
          </p>
          <a className="footer-cta" href="https://wa.me/254119444972" target="_blank" rel="noopener noreferrer">
            Book a pickup <ArrowUpRight size={18} />
          </a>
        </div>
        <div className="footer-column">
          <h3>Product</h3>
          <a href="/">Home</a>
          <a href="/services">Services</a>
          <a href="/pricing">Pricing</a>
          <a href="/login">Login</a>
        </div>
        <div className="footer-column">
          <h3>Resources</h3>
          <a href="/process">How It Works</a>
          <a href="/faq">FAQ</a>
          <a href="/contact">Contact</a>
        </div>
        <div className="footer-column">
          <h3>Contact</h3>
          <a href="tel:+254119444972">011 944 4972</a>
          <a href="mailto:opendoorslaundromat@gmail.com">Email us</a>
          <a href="https://wa.me/254119444972" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 Open Doors POS</p>
        <p className="footer-tagline">So fresh, so clean, so you.</p>
        <a href="#">Back to top ↑</a>
      </div>
    </footer>
  );
}

// Page wrappers (inline for POS-specific pages)
function PricingPage() {
  const [siteSettings, setSiteSettings] = useState(null);
  const [prices, setPrices] = useState(false);

  const priceGroups = [
    {
      t: 'Full load services',
      items: [
        ['Washing', '600'], ['Drying', '600'], ['Ironing', '700'],
        ['Wash, dry & fold', '1,200'], ['Wash, dry, iron & hang', '1,700'],
        ['Excess per kilo', '140'],
      ],
    },
    {
      t: 'Popular items',
      items: [
        ['T-shirt', '200'], ['Shirt / blouse / skirt', '200'],
        ['Trouser / dress', '200'], ['Track suit', '300'],
        ['Jacket — normal', '300'], ['Suit — two piece', '700'],
      ],
    },
    {
      t: 'Home essentials',
      items: [
        ['Duvet cover', '300'], ['Bedsheet — each', '200'],
        ['Curtains per kg', '300'], ['Pillow', '200'],
        ['Towel', '200'], ['Duvet / blanket 2kg', '700'],
      ],
    },
  ];

  useEffect(() => {
    fetch('/api/site-settings')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { setSiteSettings(data); })
      .catch(() => {});
  }, []);

  return (
    <>
      <Helmet>
        <title>Pricing | Open Doors Laundromat</title>
        <meta name="description" content="Clear, honest pricing for all laundry services. Know before you load." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="/pricing" />
        <meta property="og:title" content="Pricing | Open Doors Laundromat" />
        <meta property="og:description" content="Clear, honest pricing for all laundry services." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://open-doors-laundory.vercel.app/pricing" />
      </Helmet>

      <section className="section pricing" id="pricing">
        <div className="section-head">
          <div>
            <p className="eyebrow">Clear, honest pricing</p>
            <h2>Know before you load.</h2>
          </div>
          <p>
            Prices in Kenyan shillings. Children's single items are charged at half the adult rate.
          </p>
        </div>
        <div className="price-grid">
          {(siteSettings?.priceGroups || priceGroups).map((g) => (
            <article key={g.t}>
              <h3>{g.t}</h3>
              {g.items.map((x) => (
                <div className="price-row" key={x[0]}>
                  <span>{x[0]}</span>
                  <b>KSh {x[1]}</b>
                </div>
              ))}
            </article>
          ))}
        </div>
        <button className="all-prices" onClick={() => setPrices(!prices)}>
          More item prices <ChevronDown size={16} className={prices ? 'flipped' : ''} />
        </button>
        {prices && (
          <div className="more-prices">
            <span>Wedding gown <b>KSh 1,500–3,000</b></span>
            <span>Leather jacket <b>KSh 1,500</b></span>
            <span>School blazer <b>KSh 300</b></span>
            <span>Three-piece suit <b>KSh 800</b></span>
            <span>Blanket 4kg <b>KSh 1,000</b></span>
            <span>Sheers per kg <b>KSh 200</b></span>
          </div>
        )}
        <figure className="pricing-guide">
          <img src="/assets/pricing-guide-full.jpg" alt="Complete pricing guide" width="900" height="auto" loading="lazy" />
          <figcaption>Full pricing guide — tap or click to view clearly</figcaption>
        </figure>
        <p className="note">
          A 7kg load is approximately 25 shirts or 14 trousers. Single-unit children's clothing is half price.
        </p>
      </section>
    </>
  );
}

function BookingPageWrapper() {
  return (
    <>
      <Helmet>
        <title>Book a Pickup | Open Doors Laundromat</title>
        <meta name="description" content="Schedule your laundry pickup with Open Doors Laundromat." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="/booking" />
        <meta property="og:title" content="Book a Pickup | Open Doors Laundromat" />
        <meta property="og:description" content="Schedule your laundry pickup." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://open-doors-laundory.vercel.app/booking" />
      </Helmet>
      <BookingForm />
    </>
  );
}

function AdminPageWrapper() {
  return (
    <>
      <Helmet>
        <title>Admin Dashboard | Open Doors Laundromat</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Admin dashboard for managing Open Doors Laundromat." />
      </Helmet>
      <AdminDashboard />
    </>
  );
}

function ReceiptPageWrapper() {
  return (
    <>
      <Helmet>
        <title>Receipt | Open Doors Laundromat</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Your Open Doors Laundromat service request receipt." />
      </Helmet>
      <ReceiptPage />
    </>
  );
}

// Main App with AuthProvider and proper routing
export default function App() {
  useEffect(() => {
    const handleUnauthorized = () => {};
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  return (
    <AuthProvider>
      <ScrollToTop />
      <Routes>
        {/* Public routes with MarketingLayout */}
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/process" element={<ProcessPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/booking" element={<BookingPageWrapper />} />
          <Route path="/faq" element={<FAQPage />} />
        </Route>

        {/* Login route (public) */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected POS routes */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <POSLayout><AdminPageWrapper /></POSLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/*" element={
          <ProtectedRoute>
            <POSLayout><AdminPageWrapper /></POSLayout>
          </ProtectedRoute>
        } />

        {/* Protected POS routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <POSLayout><AdminPageWrapper /></POSLayout>
          </ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute>
            <POSLayout><OrdersPage /></POSLayout>
          </ProtectedRoute>
        } />
        <Route path="/customers" element={
          <ProtectedRoute>
            <POSLayout><CustomersPage /></POSLayout>
          </ProtectedRoute>
        } />
        <Route path="/payments" element={
          <ProtectedRoute>
            <POSLayout><PaymentsPage /></POSLayout>
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute>
            <POSLayout><ReportsPage /></POSLayout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <POSLayout><SettingsPage /></POSLayout>
          </ProtectedRoute>
        } />
        <Route path="/offline-pos" element={
          <ProtectedRoute>
            <POSLayout><OfflinePOSPage /></POSLayout>
          </ProtectedRoute>
        } />

        {/* Receipt (public) */}
        <Route path="/receipt/:token" element={<ReceiptPageWrapper />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}
