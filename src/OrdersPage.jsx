import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Eye,
  Printer,
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
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [collectionPaymentMethod, setCollectionPaymentMethod] = useState("Cash");
  const [collectionMpesaCode, setCollectionMpesaCode] = useState("");
  const [paymentBusy, setPaymentBusy] = useState(false);

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

  function handleStatusSelection(order, status) {
    if (status === "ready_for_collection") {
      setNotice("");
      setPaymentOrder(order);
      setCollectionPaymentMethod("Cash");
      setCollectionMpesaCode("");
      return;
    }
    handleStatusChange(order, status);
  }

  function handlePrintCollectionDetails() {
    document.body.classList.add("print-collection-details");
    const cleanup = () => document.body.classList.remove("print-collection-details");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
  }

  async function handleCollectionPayment(event) {
    event.preventDefault();
    if (!paymentOrder) return;
    const bookingId = paymentOrder.externalId;
    if (!navigator.onLine || !bookingId) {
      setNotice("This booking must be online and synced before payment can be recorded.");
      return;
    }
    const code = collectionMpesaCode.trim().toUpperCase();
    if (collectionPaymentMethod === "M-Pesa" && !/^[A-Z0-9]{6,20}$/.test(code)) {
      setNotice("Enter a valid M-Pesa transaction code.");
      return;
    }
    setPaymentBusy(true);
    setNotice("");
    try {
      const amount = Number(paymentOrder.totalAmount ?? paymentOrder.estimatedTotal) || 0;
      const response = await fetch(`/api/pos/bookings/${bookingId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": `collection-${bookingId}-${Date.now()}` },
        body: JSON.stringify({
          amount,
          method: collectionPaymentMethod,
          amountReceived: collectionPaymentMethod === "Cash" ? amount : undefined,
          mpesaReference: collectionPaymentMethod === "M-Pesa" ? code : undefined,
        }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Payment could not be recorded.");
      }
      const dashboard = await fetch("/api/admin/dashboard");
      if (dashboard.ok) {
        const data = await dashboard.json();
        await upsertServerOrders(data.requests || []);
      }
      await refresh();
      setPaymentOrder((current) => current ? { ...current, paymentStatus: "paid", paymentMethod: collectionPaymentMethod, status: "ready_for_collection" } : current);
      setNotice(`Payment recorded by ${collectionPaymentMethod}. The booking is completed.`);
    } catch (error) {
      setNotice(error.message || "Payment could not be recorded. Please try again.");
    } finally {
      setPaymentBusy(false);
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
                <th>Customer</th>
                <th>Services</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Served by</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const servedBy = order.customer?.servedByName
                  || order.servedByName
                  || order.servedBy
                  || "Not recorded";
                return (
                  <tr key={order.id}>
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
                      <small>{order.paymentMethod === 'Draft' ? 'Unpaid' : (order.paymentMethod || 'Not selected')}</small>
                    </td>
                    <td data-label="Served by">{servedBy}</td>
                    <td data-label="Status" className="booking-status-cell">
                      <select
                        value={workflowStatus(order.status)}
                        onChange={(e) => handleStatusSelection(order, e.target.value)}
                        aria-label={`Change status for order ${order.receiptNumber || order.id}`}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </td>
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
      {paymentOrder && (
        <div className="collection-payment-modal" role="dialog" aria-modal="true" aria-labelledby="collection-payment-title" onClick={() => !paymentBusy && setPaymentOrder(null)}>
          <form onSubmit={handleCollectionPayment} onClick={(event) => event.stopPropagation()}>
            <button type="button" className="collection-payment-close" onClick={() => setPaymentOrder(null)} disabled={paymentBusy} aria-label="Close payment dialog">×</button>
            <section className="thermal-receipt" aria-label="Printable payment receipt">
              <header className="thermal-receipt-header">
                <strong>OPEN DOORS LAUNDROMAT</strong>
                <span>Chuna Mall, Shop 10, Kitengela</span>
                <span>PAYMENT RECEIPT</span>
              </header>
              <div className="thermal-receipt-meta">
                <p><span>Receipt</span><strong>{paymentOrder.receiptNumber || `Booking #${paymentOrder.id}`}</strong></p>
                <p><span>Date</span><strong>{new Date().toLocaleString()}</strong></p>
                <p><span>Customer</span><strong>{paymentOrder.customer?.name || paymentOrder.customerName || paymentOrder.name || "Walk-in"}</strong></p>
                <p><span>Contact</span><strong>{paymentOrder.customer?.phone || paymentOrder.customerPhone || paymentOrder.phone || "Not recorded"}</strong></p>
                <p><span>Served by</span><strong>{paymentOrder.customer?.servedByName || paymentOrder.servedByName || paymentOrder.servedBy || "Not recorded"}</strong></p>
              </div>
              <div className="thermal-receipt-items">
                <div className="thermal-receipt-item-heading"><span>ITEM</span><span>QTY</span><span>AMOUNT</span></div>
                {(paymentOrder.items || []).length > 0 ? (paymentOrder.items || []).map((item, index) => {
                  const quantity = Number(item.kg ?? item.quantity) || 1;
                  const subtotal = Number(item.subtotal) || ((Number(item.unitPrice ?? item.price) || 0) * quantity);
                  return <div className="thermal-receipt-item" key={`${item.service || item.name}-${index}`}><span>{item.service || item.name || "Laundry service"}</span><span>{quantity}</span><strong>KSh {subtotal.toLocaleString()}</strong></div>;
                }) : <div className="thermal-receipt-item"><span>{paymentOrder.service || "Laundry service"}</span><span>{paymentOrder.quantity || 1}</span><strong>KSh {(Number(paymentOrder.totalAmount ?? paymentOrder.estimatedTotal) || 0).toLocaleString()}</strong></div>}
              </div>
              <div className="thermal-receipt-summary">
                <p><span>Payment</span><strong>{paymentOrder.paymentMethod || collectionPaymentMethod}</strong></p>
                {collectionMpesaCode && <p><span>Reference</span><strong>{collectionMpesaCode}</strong></p>}
                <p className="thermal-receipt-total"><span>TOTAL PAID</span><strong>KSh {(Number(paymentOrder.totalAmount ?? paymentOrder.estimatedTotal) || 0).toLocaleString()}</strong></p>
              </div>
              <footer>
                <strong>PAID</strong>
                <span>Thank you for choosing us.</span>
              </footer>
            </section>
            <p className="eyebrow">Ready for collection</p>
            <h2 id="collection-payment-title">Customer and booking details</h2>
            <p>Review the full details for <strong>{paymentOrder.receiptNumber || `Booking #${paymentOrder.id}`}</strong>.</p>
            <div className="collection-customer-details">
              <h3>Customer details</h3>
              <dl>
                <div><dt>Name</dt><dd>{paymentOrder.customer?.name || paymentOrder.customerName || paymentOrder.name || "Walk-in"}</dd></div>
                <div><dt>Contact</dt><dd>{paymentOrder.customer?.phone || paymentOrder.customerPhone || paymentOrder.phone || "Not recorded"}</dd></div>
                <div><dt>Email</dt><dd>{paymentOrder.customer?.email || paymentOrder.customerEmail || paymentOrder.email || "Not recorded"}</dd></div>
                <div><dt>Gender</dt><dd>{paymentOrder.customer?.gender || paymentOrder.gender || "Not recorded"}</dd></div>
                <div className="collection-customer-services"><dt>Address</dt><dd>{paymentOrder.customer?.address || paymentOrder.customer?.location || paymentOrder.address || paymentOrder.location || "Not recorded"}</dd></div>
                <div><dt>Served by</dt><dd>{paymentOrder.customer?.servedByName || paymentOrder.servedByName || paymentOrder.servedBy || "Not recorded"}</dd></div>
                <div className="collection-customer-services"><dt>Services</dt><dd>{paymentOrder.service || "No service details"}</dd></div>
                <div><dt>Items</dt><dd>{(paymentOrder.items || []).length}</dd></div>
                <div><dt>Payment status</dt><dd>{paymentOrder.paymentStatus === "paid" ? "Paid" : "Unpaid"}</dd></div>
                <div><dt>Payment method</dt><dd>{paymentOrder.paymentStatus === "paid" ? (paymentOrder.paymentMethod || "Recorded") : collectionPaymentMethod}</dd></div>
                <div><dt>Date</dt><dd>{paymentOrder.createdAt ? new Date(paymentOrder.createdAt).toLocaleString() : "Not recorded"}</dd></div>
                <div className="collection-customer-services"><dt>Notes</dt><dd>{paymentOrder.notes || "No notes"}</dd></div>
              </dl>
            </div>
            <div className="collection-payment-total">
              <span>Amount due</span>
              <strong>KSh {(Number(paymentOrder.totalAmount ?? paymentOrder.estimatedTotal) || 0).toLocaleString()}</strong>
            </div>
            {paymentOrder.paymentStatus !== "paid" && <>
            <label className="sale-field">
              <span>Payment method</span>
              <select value={collectionPaymentMethod} onChange={(event) => setCollectionPaymentMethod(event.target.value)} disabled={paymentBusy}>
                <option value="Cash">Cash</option>
                <option value="M-Pesa">M-Pesa</option>
              </select>
            </label>
            {collectionPaymentMethod === "M-Pesa" && (
              <label className="sale-field">
                <span>M-Pesa transaction code *</span>
                <input value={collectionMpesaCode} onChange={(event) => setCollectionMpesaCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20))} minLength={6} maxLength={20} required autoFocus />
              </label>
            )}</>}
            <div className="collection-payment-actions">
              {paymentOrder.paymentStatus === "paid" && <button type="button" className="btn-secondary collection-print-button" onClick={handlePrintCollectionDetails}><Printer size={16} /> Print receipt</button>}
              {paymentOrder.paymentStatus === "paid" && <button type="button" className="btn-primary" onClick={() => navigate("/payments")}>View payments</button>}
              <button type="button" className="btn-secondary" onClick={() => setPaymentOrder(null)} disabled={paymentBusy}>{paymentOrder.paymentStatus === "paid" ? "Close" : "Cancel"}</button>
              {paymentOrder.paymentStatus !== "paid" && <button type="submit" className="btn-primary" disabled={paymentBusy}>{paymentBusy ? "Recording…" : "Record payment"}</button>}
              {paymentOrder.paymentStatus === "paid" && workflowStatus(paymentOrder.status) !== "ready_for_collection" && (
                <button type="button" className="btn-primary" onClick={async () => { await handleStatusChange(paymentOrder, "ready_for_collection"); setPaymentOrder(null); }}>Confirm ready for collection</button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
