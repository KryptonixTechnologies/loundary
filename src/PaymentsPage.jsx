import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, DollarSign, Eye, Search, X } from 'lucide-react';

const money = (value) => `KSh ${Number(value || 0).toLocaleString()}`;

export default function PaymentsPage() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ totalTransactions: 0, totalRevenue: 0, totalCash: 0, totalMpesa: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [attendant, setAttendant] = useState('');
  const [service, setService] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    fetch('/api/admin/reports')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then((report) => {
        setPayments(report.transactions || []);
        setSummary(report.summary || {});
        setLoading(false);
      })
      .catch(() => {
        setLoadError('Cannot load transaction records. Check the server connection and retry.');
        setLoading(false);
      });
  }, []);

  const attendantOptions = [...new Set(payments
    .map((payment) => payment.receivedBy?.name || payment.receivedBy?.username || payment.receivedBy?.email)
    .filter(Boolean))].sort();
  const serviceOptions = [...new Set(payments
    .flatMap((payment) => payment.booking?.items?.map((item) => item.service) || [])
    .filter(Boolean))].sort();
  const needle = search.trim().toLowerCase();
  const filtered = payments.filter((payment) => {
    const paymentAttendant = payment.receivedBy?.name || payment.receivedBy?.username || payment.receivedBy?.email || 'Not recorded';
    const services = payment.booking?.items?.map((item) => item.service) || [];
    const haystack = [
      payment.receipt?.receiptNumber,
      payment.booking?.receiptNumber,
      payment.booking?.name,
      payment.booking?.phone,
      payment.mpesaReference,
      paymentAttendant,
      ...services,
    ].filter(Boolean).join(' ').toLowerCase();
    const timestamp = new Date(payment.createdAt).getTime();
    const fromTime = from ? new Date(`${from}T00:00:00+03:00`).getTime() : null;
    const toTime = to ? new Date(`${to}T23:59:59.999+03:00`).getTime() : null;
    return (!needle || haystack.includes(needle))
      && (!method || payment.method === method)
      && (!attendant || paymentAttendant === attendant)
      && (!service || services.includes(service))
      && (!fromTime || timestamp >= fromTime)
      && (!toTime || timestamp <= toTime);
  });
  const filteredSummary = {
    totalTransactions: filtered.length,
    totalRevenue: filtered.reduce((sum, payment) => sum + payment.amount, 0),
    totalCash: filtered.filter((payment) => payment.method === 'Cash').reduce((sum, payment) => sum + payment.amount, 0),
    totalMpesa: filtered.filter((payment) => payment.method === 'M-Pesa').reduce((sum, payment) => sum + payment.amount, 0),
  };
  const filtersActive = search || method || attendant || service || from || to;

  if (loading) return <div className="pos-page"><h2>Payments</h2><p>Loading transactions…</p></div>;

  return (
    <div className="pos-page">
      <header className="pos-page-header">
        <div>
          <p className="eyebrow">Transaction report</p>
          <h2>Payment reconciliation.</h2>
        </div>
      </header>

      {loadError && <p className="sale-notice error" role="alert">{loadError}</p>}

      <div className="report-stats payment-report-stats">
        <div className="stat-card"><ClipboardList size={20} /><div><small>Transactions</small><b>{filteredSummary.totalTransactions}</b></div></div>
        <div className="stat-card"><DollarSign size={20} /><div><small>Total Revenue</small><b>{money(filteredSummary.totalRevenue)}</b></div></div>
        <div className="stat-card"><DollarSign size={20} /><div><small>Cash</small><b>{money(filteredSummary.totalCash)}</b></div></div>
        <div className="stat-card"><DollarSign size={20} /><div><small>M-Pesa</small><b>{money(filteredSummary.totalMpesa)}</b></div></div>
      </div>

      <div className="report-filters payment-report-filters" aria-label="Transaction filters">
        <label className="report-filter-search">
          <span>Search</span>
          <div>
            <Search size={18} aria-hidden="true" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Receipt, booking, customer or M-Pesa" />
          </div>
        </label>
        <label><span>From</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label><span>To</span><input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></label>
        <label>
          <span>Method</span>
          <select value={method} onChange={(event) => setMethod(event.target.value)}>
            <option value="">All methods</option><option value="Cash">Cash</option><option value="M-Pesa">M-Pesa</option>
          </select>
        </label>
        <label>
          <span>Attendant</span>
          <select value={attendant} onChange={(event) => setAttendant(event.target.value)}>
            <option value="">All attendants</option>
            {attendantOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            <option value="Not recorded">Not recorded</option>
          </select>
        </label>
        <label>
          <span>Service</span>
          <select value={service} onChange={(event) => setService(event.target.value)}>
            <option value="">All services</option>
            {serviceOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <button type="button" className="report-clear-button" disabled={!filtersActive} onClick={() => {
          setSearch(''); setMethod(''); setAttendant(''); setService(''); setFrom(''); setTo('');
        }}><X size={16} aria-hidden="true" />Clear</button>
      </div>

      <p className="report-result-count" aria-live="polite">
        Showing {filtered.length} of {summary.totalTransactions || payments.length} transactions
      </p>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={28} />
          <h3>{payments.length ? 'No transactions match these filters' : 'No recorded payments'}</h3>
          <p>{payments.length ? 'Change or clear the filters.' : 'Successful payments will appear here.'}</p>
        </div>
      ) : (
        <div className="report-table-wrap payment-table-wrap">
          <table className="report-table payment-table">
            <thead>
              <tr>
                <th scope="col">Receipt / Booking</th>
                <th scope="col">Customer</th>
                <th scope="col">Service &amp; items</th>
                <th scope="col">Amount</th>
                <th scope="col">Method / Reference</th>
                <th scope="col">Attendant</th>
                <th scope="col">Date &amp; time</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((payment) => {
                const booking = payment.booking || {};
                const paymentAttendant = payment.receivedBy?.name || payment.receivedBy?.username || payment.receivedBy?.email || 'Not recorded';
                return (
                  <tr key={payment.id}>
                    <td>
                      <strong>{payment.receipt?.receiptNumber || booking.receiptNumber || '—'}</strong>
                      <small>{booking.receiptNumber || booking.id?.slice(0, 8)}</small>
                    </td>
                    <td><strong>{booking.name || booking.customer?.name || 'Walk-in'}</strong><small>{booking.phone || booking.customer?.phone || 'No phone'}</small></td>
                    <td className="report-items-cell">
                      {booking.items?.length ? (
                        <ul className="report-item-list">
                          {booking.items.map((item) => (
                            <li key={item.id}>
                              <span>{item.service}</span>
                              <strong>{money(item.unitPrice)} × {item.kg} = {money(item.subtotal)}</strong>
                            </li>
                          ))}
                        </ul>
                      ) : booking.service || 'No item details'}
                    </td>
                    <td className="report-price">{money(payment.amount)}</td>
                    <td>
                      <strong>{payment.method}</strong>
                      <small>{payment.method === 'M-Pesa' ? payment.mpesaReference || 'Missing reference' : 'No reference required'}</small>
                    </td>
                    <td>{paymentAttendant}</td>
                    <td><time dateTime={payment.createdAt}>{new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Nairobi' }).format(new Date(payment.createdAt))}</time></td>
                    <td>
                      {booking.receiptToken ? (
                        <button type="button" className="report-view-button" onClick={() => navigate(`/receipt/${booking.receiptToken}`)}>
                          <Eye size={16} aria-hidden="true" />Receipt
                        </button>
                      ) : <span className="payment-no-receipt">Unavailable</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
