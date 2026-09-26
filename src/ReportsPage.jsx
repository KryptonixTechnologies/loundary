import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import {
  ArrowUpRight,
  Check,
  ClipboardList,
  Clock,
  DollarSign,
  Edit3,
  Eye,
  Package,
  Search,
  Trash2,
  X,
  TrendingUp,
  BarChart3,
  Users,
  ShoppingCart,
} from 'lucide-react';

export default function ReportsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [viewing, setViewing] = useState(null);
  const [activitySearch, setActivitySearch] = useState('');
  const [activityDate, setActivityDate] = useState('');
  const [activityAttendant, setActivityAttendant] = useState('');

  function load() {
    setLoadError('');
    fetch('/api/admin/dashboard')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setLoadError(
          navigator.onLine === false
            ? 'You are offline. Reports need a server connection — reconnect and retry.'
            : 'Cannot reach the server. Check the connection and retry.'
        );
      });
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!viewing) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setViewing(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [viewing]);

  if (loading) return <div className="pos-page"><h2>Reports</h2><p>Loading reports…</p></div>;
  if (!data) return (
    <div className="pos-page">
      <header className="pos-page-header">
        <div>
          <p className="eyebrow">Reports</p>
          <h2>Business analytics.</h2>
        </div>
      </header>
      <p className="sale-notice error" role="alert">{loadError || 'Reports unavailable.'}</p>
      <button className="btn-primary" onClick={() => { setLoading(true); load(); }}>Retry</button>
    </div>
  );

  const { stats, daily, requests } = data;
  const attendantOptions = [...new Set(
    requests
      .map((req) => req.createdBy?.name || req.createdBy?.username || req.createdBy?.email)
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));
  const normalizedSearch = activitySearch.trim().toLowerCase();
  const filteredRequests = requests.filter((req) => {
    const attendant = req.createdBy?.name || req.createdBy?.username || req.createdBy?.email || 'Not recorded';
    const searchable = [
      req.id,
      req.receiptNumber,
      req.name,
      req.phone,
      req.service,
      attendant,
      ...(req.items || []).flatMap((item) => [item.service, item.kg]),
    ].filter(Boolean).join(' ').toLowerCase();
    const nairobiDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(req.createdAt));
    return (!normalizedSearch || searchable.includes(normalizedSearch))
      && (!activityDate || nairobiDate === activityDate)
      && (!activityAttendant || attendant === activityAttendant);
  });
  const filtersActive = activitySearch || activityDate || activityAttendant;

  return (
    <div className="pos-page">
      <header className="pos-page-header">
        <div>
          <p className="eyebrow">Reports</p>
          <h2>Business analytics.</h2>
        </div>
      </header>
      <div className="report-stats">
        <div className="stat-card">
          <ClipboardList size={24} />
          <div>
            <small>Today's Requests</small>
            <b>{stats.today || 0}</b>
          </div>
        </div>
        <div className="stat-card">
          <TrendingUp size={24} />
          <div>
            <small>New Today</small>
            <b>{stats.new || 0}</b>
          </div>
        </div>
        <div className="stat-card">
          <Check size={24} />
          <div>
            <small>Completed</small>
            <b>{stats.completed || 0}</b>
          </div>
        </div>
        <div className="stat-card">
          <DollarSign size={24} />
          <div>
            <small>Total Requests</small>
            <b>{stats.total || 0}</b>
          </div>
        </div>
      </div>
      <div className="report-section">
        <h3>Weekly Trend</h3>
        <div className="bar-chart">
          {daily.map((day) => (
            <div key={day.date} className="bar-item">
              <b>{day.count}</b>
              <span style={{ height: `${Math.max(8, (day.count / Math.max(1, ...daily.map(d => d.count))) * 170)}px` }}></span>
              <small>{day.label}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="report-section">
        <h3>Recent Activity</h3>
        <div className="report-filters" aria-label="Activity filters">
          <label className="report-filter-search">
            <span>Search records</span>
            <div>
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={activitySearch}
                onChange={(event) => setActivitySearch(event.target.value)}
                placeholder="ID, customer or item"
              />
            </div>
          </label>
          <label>
            <span>Date</span>
            <input type="date" value={activityDate} onChange={(event) => setActivityDate(event.target.value)} />
          </label>
          <label>
            <span>Attendant</span>
            <select value={activityAttendant} onChange={(event) => setActivityAttendant(event.target.value)}>
              <option value="">All attendants</option>
              {attendantOptions.map((attendant) => <option key={attendant} value={attendant}>{attendant}</option>)}
              <option value="Not recorded">Not recorded</option>
            </select>
          </label>
          <button
            type="button"
            className="report-clear-button"
            disabled={!filtersActive}
            onClick={() => {
              setActivitySearch('');
              setActivityDate('');
              setActivityAttendant('');
            }}
          >
            <X size={16} aria-hidden="true" />
            Clear
          </button>
        </div>
        <p className="report-result-count" aria-live="polite">
          Showing {filteredRequests.length} of {requests.length} records
        </p>
        {requests.length === 0 ? (
          <p className="empty-state">No activity yet.</p>
        ) : filteredRequests.length === 0 ? (
          <p className="empty-state">No records match these filters.</p>
        ) : (
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Items</th>
                  <th scope="col">Price</th>
                  <th scope="col">Who</th>
                  <th scope="col">Date &amp; time</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => {
                  const attendant = req.createdBy?.name
                    || req.createdBy?.username
                    || req.createdBy?.email
                    || 'Not recorded';
                  return (
                    <tr key={req.id}>
                      <td>
                        <strong>{req.receiptNumber || req.id.slice(0, 8)}</strong>
                        {req.receiptNumber && <small>{req.id.slice(0, 8)}</small>}
                      </td>
                      <td>{req.name || 'Walk-in'}</td>
                      <td className="report-items-cell">
                        {req.items?.length ? (
                          <ul className="report-item-list">
                            {req.items.map((item) => (
                              <li key={item.id}>
                                <span>{item.service}</span>
                                <strong>
                                  KSh {(item.unitPrice || 0).toLocaleString()}
                                  {' × '}{item.kg}
                                  {' = '}KSh {(item.subtotal || 0).toLocaleString()}
                                </strong>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          req.service || '—'
                        )}
                      </td>
                      <td className="report-price">KSh {(req.estimatedTotal || 0).toLocaleString()}</td>
                      <td>{attendant}</td>
                      <td>
                        <time dateTime={req.createdAt}>
                          {new Intl.DateTimeFormat('en-KE', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                            timeZone: 'Africa/Nairobi',
                          }).format(new Date(req.createdAt))}
                        </time>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="report-view-button"
                          onClick={() => setViewing(req)}
                          aria-label={`View details for ${req.receiptNumber || req.name}`}
                        >
                          <Eye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {viewing && (
        <div
          className="request-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-detail-title"
          onClick={() => setViewing(null)}
        >
          <div onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setViewing(null)} aria-label="Close details">
              <X size={18} />
            </button>
            <p className="eyebrow">{viewing.receiptNumber || viewing.id}</p>
            <h2 id="report-detail-title">{viewing.name || 'Walk-in'}</h2>
            <div className="request-detail-grid">
              <span>
                <small>Customer phone</small>
                <b>{viewing.phone || 'Not provided'}</b>
              </span>
              <span>
                <small>Attendant</small>
                <b>{viewing.createdBy?.name || viewing.createdBy?.username || viewing.createdBy?.email || 'Not recorded'}</b>
              </span>
              <span>
                <small>Status</small>
                <b>{String(viewing.status || 'unknown').replaceAll('_', ' ')}</b>
              </span>
              <span>
                <small>Payment</small>
                <b>{viewing.paymentMethod || 'Not selected'} · {viewing.paymentStatus || 'pending'}</b>
              </span>
              <span>
                <small>Date &amp; time</small>
                <b>{new Intl.DateTimeFormat('en-KE', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'Africa/Nairobi',
                }).format(new Date(viewing.createdAt))}</b>
              </span>
              <span>
                <small>Record ID</small>
                <b className="report-record-id">{viewing.id}</b>
              </span>
            </div>
            <div className="modal-services">
              {viewing.items?.length ? viewing.items.map((item) => (
                <div key={item.id}>
                  <span>{item.service}</span>
                  <b>
                    KSh {(item.unitPrice || 0).toLocaleString()}
                    {' × '}{item.kg}
                    {' = '}KSh {(item.subtotal || 0).toLocaleString()}
                  </b>
                </div>
              )) : <p>{viewing.service || 'No items recorded.'}</p>}
              <div className="modal-total">
                <span>Total</span>
                <b>KSh {(viewing.estimatedTotal || 0).toLocaleString()}</b>
              </div>
            </div>
            <div className="modal-notes">
              <small>Notes</small>
              <p>{viewing.notes || 'No notes provided.'}</p>
            </div>
            {viewing.receiptToken && (
              <button type="button" className="report-view-button" onClick={() => navigate(`/receipt/${viewing.receiptToken}`)}>
                Open receipt <ArrowUpRight size={16} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
