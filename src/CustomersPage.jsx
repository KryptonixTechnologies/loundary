import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Search,
  Phone,
  Mail,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { useOffline, useOfflineCustomers } from './hooks/useOffline.js';
import { upsertServerCustomers } from './lib/db.js';

export default function CustomersPage() {
  const navigate = useNavigate();
  const { createCustomerOffline, deleteCustomerOffline, processOutbox, isOnline, backendDown } = useOffline();
  const { customers, loading, refresh } = useOfflineCustomers();
  const [search, setSearch] = useState('');
  const [serverKnown, setServerKnown] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', gender: '', servedBy: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Local-first: Dexie renders immediately; server refreshes the mirror
  // when online (by phone, without touching pending local rows).
  useEffect(() => {
    let cancelled = false;
    if (!navigator.onLine) {
      setServerKnown(false);
      return;
    }
    fetch('/api/pos/customers')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(async (data) => {
        await upsertServerCustomers(data || []);
        if (!cancelled) {
          refresh();
          setServerKnown(true);
        }
      })
      .catch(() => {
        if (!cancelled) setServerKnown(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function registerCustomer(event) {
    event.preventDefault();
    setFormError('');
    const name = form.name.trim();
    const phone = form.phone.replace(/[\s-]/g, '');
    const servedBy = form.servedBy.trim();
    if (!name || !phone || !servedBy) {
      setFormError('Full name, contact number, and served by are required.');
      return;
    }
    if (!/^[+\d][\d\s-]{5,29}$/.test(form.phone)) {
      setFormError('Enter a valid contact number.');
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setFormError('Enter a valid email address.');
      return;
    }
    if (customers.some((customer) => customer.phone.replace(/[\s-]/g, '') === phone)) {
      setFormError('A customer with this contact number is already registered.');
      return;
    }
    setSaving(true);
    try {
      await createCustomerOffline({
        name,
        phone,
        email: form.email.trim() || null,
        gender: form.gender || null,
        servedBy,
      });
      if (isOnline && !backendDown) await processOutbox();
      await refresh();
      setForm({ name: '', phone: '', email: '', gender: '', servedBy: '' });
      setShowForm(false);
    } catch {
      setFormError('Could not save this customer. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(customer) {
    if (!window.confirm(`Delete ${customer.name}? This is only allowed when the customer has no bookings.`)) return;
    setFormError('');
    try {
      await deleteCustomerOffline(customer);
      await refresh();
      if (isOnline && !backendDown) await processOutbox();
    } catch (error) {
      setFormError(error.message || 'Could not delete this customer.');
    }
  }

  const filtered = search
    ? customers.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.phone || '').includes(search)
      )
    : customers;

  if (loading) return <div className="pos-page"><h2>Customers</h2><p>Loading customers…</p></div>;

  return (
    <div className="pos-page">
      <header className="pos-page-header">
        <div>
          <p className="eyebrow">Customers</p>
          <h2>Customer directory.</h2>
        </div>
        <div className="customer-header-actions">
          <div className="pos-search">
            <Search size={18} />
            <input type="search" placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search customers by name or phone" />
          </div>
          <button type="button" className="btn-primary" onClick={() => setShowForm((open) => !open)}>
            <UserPlus size={18} /> Register customer
          </button>
        </div>
      </header>
      {!showForm && formError && <p className="sale-notice error" role="alert">{formError}</p>}
      {showForm && (
        <form className="customer-registration-form" onSubmit={registerCustomer}>
          <h3>Register customer</h3>
          {formError && <p className="sale-notice error" role="alert">{formError}</p>}
          <div className="customer-form-grid">
            <label><span>Full name *</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" /></label>
            <label><span>Contact number *</span><input required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} autoComplete="tel" placeholder="0700 000 000" /></label>
            <label><span>Email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" /></label>
            <label>
              <span>Gender</span>
              <select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}>
                <option value="">Select gender</option><option value="Female">Female</option><option value="Male">Male</option>
              </select>
            </label>
            <label className="customer-served-by-field">
              <span>Served by *</span>
              <input
                required
                value={form.servedBy}
                onChange={(event) => setForm({ ...form, servedBy: event.target.value })}
                placeholder="Enter attendant name"
                autoComplete="name"
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save customer'}</button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}
      {!serverKnown && (
        <p className="sale-notice offline" role="status">
          Showing {customers.length} customer(s) saved on this device. Connect to see the latest server directory.
        </p>
      )}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={28} />
          <h3>No customers found</h3>
          <p>{customers.length === 0 ? 'Register the first customer to create a booking.' : 'No customers match this search.'}</p>
        </div>
      ) : (
        <div className="report-table-wrap customer-table-wrap">
          <table className="report-table customer-table">
            <thead>
              <tr>
                <th scope="col">Customer</th>
                <th scope="col">Contact</th>
                <th scope="col">Email</th>
                <th scope="col">Gender</th>
                <th scope="col">Served by</th>
                <th scope="col">Sync status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <strong>{customer.name}</strong>
                    {customer.externalId && <small className="customer-code">ID: {String(customer.externalId).slice(0, 12)}</small>}
                  </td>
                  <td>
                    <span className="customer-detail">
                      <Phone size={15} aria-hidden="true" />
                      {customer.phone}
                    </span>
                  </td>
                  <td>
                    {customer.email ? (
                      <span className="customer-detail">
                        <Mail size={15} aria-hidden="true" />
                        {customer.email}
                      </span>
                    ) : <span className="customer-empty-value">Not provided</span>}
                  </td>
                  <td>{customer.gender || <span className="customer-empty-value">Not provided</span>}</td>
                  <td>{customer.servedByName || customer.servedBy || customer.createdBy?.name || customer.createdBy?.username || customer.createdBy?.email || <span className="customer-empty-value">Not recorded</span>}</td>
                  <td>
                    <span className={`sync-status ${customer.syncStatus === 'pending' ? 'pending' : 'synced'}`}>
                      {customer.syncStatus === 'pending' ? 'Pending sync' : 'Synced'}
                    </span>
                  </td>
                  <td>
                    <div className="customer-table-actions">
                      <button className="customer-booking-button" onClick={() => navigate('/new-order', { state: { customerId: customer.id } })}>
                        New booking
                      </button>
                      <button className="delete-customer" onClick={() => deleteCustomer(customer)}>
                        <Trash2 size={16} aria-hidden="true" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
