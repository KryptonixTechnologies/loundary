import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Eye,
} from 'lucide-react';
import { useOfflineOrders } from './hooks/useOffline.js';
import { upsertServerOrders } from './lib/db.js';
import { generateReceiptPDF, downloadPDFReceipt } from './lib/receipt.js';

const STATUS_OPTIONS = [
  { value: 'booked', label: 'Received' },
  { value: 'washing', label: 'Washing' },
  { value: 'drying', label: 'Drying' },
  { value: 'ironing', label: 'Ironing' },
  { value: 'ready_for_collection', label: 'Ready for collection' },
];

const LEGACY_STATUS = { new: 'booked', pending: 'booked', confirmed: 'booked' };
const workflowStatus = (status) => LEGACY_STATUS[status] || status;
const statusLabel = (status) => STATUS_OPTIONS.find((option) => option.value === workflowStatus(status))?.label || status;

export default function OrdersPage() {
  const navigate = useNavigate();
  const { orders, loading, refresh } = useOfflineOrders();
  const [filter, setFilter] = useState('all');
  const [notice, setNotice] = useState('');
  const [serverKnown, setServerKnown] = useState(true);

  function handleLocalReceipt(order) {
    // Regenerate the receipt deterministically from the local row —
    // works fully offline, same data as the original receipt.
    try {
      const pdf = generateReceiptPDF(
        {
          id: order.id,
          name: order.customerName || order.name,
          phone: '',
          estimatedTotal: Number(order.totalAmount ?? order.estimatedTotal) || 0,
          paymentMethod: order.paymentMethod || 'Cash',
          status: order.status,
          items: (order.items || []).map((i) => ({
            service: i.service || i.name,
            kg: i.kg ?? i.quantity ?? 1,
            unitPrice: i.unitPrice ?? i.price ?? 0,
            subtotal: i.subtotal ?? 0,
          })),
          createdAt: order.createdAt,
        },
        order.receiptNumber || `OD-LOCAL-${order.id}`,
        order.receiptToken || ''
      );
      downloadPDFReceipt({ ...pdf, receiptNumber: order.receiptNumber || `OD-LOCAL-${order.id}` });
    } catch {
      setNotice('Could not generate the receipt PDF. Please try again.');
    }
  }

  // Local-first: Dexie renders immediately; server refreshes the mirror
  // when online. Offline shows local rows with an honest notice.
  useEffect(() => {
    let cancelled = false;
    if (!navigator.onLine) {
      setServerKnown(false);
      return;
    }
    fetch('/api/admin/dashboard')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(async (data) => {
        await upsertServerOrders(data.requests || []);
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

  const filtered = filter === 'all'
    ? orders
    : orders.filter((o) => workflowStatus(o.status) === filter);

  async function handleStatusChange(order, status) {
    setNotice('');
    // Local-first status change: applies instantly, queues for the server
    // when the row originated on this device or is a server mirror.
    try {
      const { updateLocalOrder } = await import('./lib/db.js');
      const { enqueueSync } = await import('./lib/offline.js');
      await updateLocalOrder(order.id, { status });
      if (order.clientId) {
        await enqueueSync('order', order.clientId, 'update', { status });
      }
      refresh();
      if (!navigator.onLine) {
        setNotice('You are offline. The status was saved on this device and will sync automatically.');
      }
    } catch {
      setNotice('Could not update the status. Please try again.');
    }
  }

  if (loading) return <div className="pos-page orders-page"><h2>Bookings</h2><p>Loading bookings…</p></div>;

  return (
    <div className="pos-page orders-page">
      <header className="pos-page-header">
        <div>
          <p className="eyebrow">Orders</p>
          <h2>All customer requests.</h2>
        </div>
        <div className="pos-filters" role="group" aria-label="Filter orders by status">
          {[{ value: 'all', label: 'All' }, ...STATUS_OPTIONS].map((option) => (
            <button
              key={option.value}
              className={filter === option.value ? 'active' : ''}
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>
      {!serverKnown && (
        <p className="sale-notice offline" role="status">
          Showing {orders.length} order(s) saved on this device. Connect to see the latest server orders.
        </p>
      )}
      {notice && (
        <p className="sale-notice" role="status">{notice}</p>
      )}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={28} />
          <h3>No {filter === 'all' ? '' : statusLabel(filter)} bookings</h3>
          <p>{orders.length === 0 ? 'Create your first sale from New Sale.' : 'No orders match this filter.'}</p>
        </div>
      ) : (
        <div className="booking-table-wrap">
          <table className="booking-table">
            <thead>
              <tr>
                <th>Booking</th>
                <th>Status</th>
                <th>Customer</th>
                <th>Services</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Attendant</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const attendant = order.createdBy?.name
                  || order.createdBy?.username
                  || order.createdBy?.email
                  || order.attendant
                  || "Not recorded";
                return (
                  <tr key={order.id}>
                    <td data-label="Booking" className="booking-number-cell">
                      <strong>{order.receiptNumber || `Booking #${order.externalId || order.id}`}</strong>
                      {order.syncStatus === "pending" && <small>Pending sync</small>}
                    </td>
                    <td data-label="Status" className="booking-status-cell">
                      <select
                        value={workflowStatus(order.status)}
                        onChange={(e) => handleStatusChange(order, e.target.value)}
                        aria-label={`Change status for order ${order.receiptNumber || order.id}`}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Customer"><strong>{order.customerName || order.name || "Walk-in"}</strong></td>
                    <td data-label="Services" className="booking-services-cell">{order.service || "No service details"}</td>
                    <td data-label="Items" className="booking-items-cell">{(order.items || []).length}</td>
                    <td data-label="Amount" className="booking-amount-cell">
                      KSh {(Number(order.totalAmount ?? order.estimatedTotal) || 0).toLocaleString()}
                    </td>
                    <td data-label="Payment" className="booking-payment-cell">
                      <span className={`payment-state payment-state-${order.paymentStatus === 'paid' ? 'paid' : 'pending'}`}>
                        {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                      <small>{order.paymentMethod || 'Not selected'}</small>
                    </td>
                    <td data-label="Attendant">{attendant}</td>
                    <td data-label="Action">
                      <div className="booking-actions">
                        {order.receiptToken ? (
                          <button onClick={() => navigate(`/receipt/${order.receiptToken}`)}>
                            <Eye size={16} /> Receipt
                          </button>
                        ) : (
                          order.receiptNumber && (
                            <button onClick={() => handleLocalReceipt(order)} title="Receipt saved on this device (pending sync)">
                              <Eye size={16} /> PDF
                            </button>
                          )
                        )}
                      </div>
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
