import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Minus, Trash2, Search, Download, Printer, CheckCircle, AlertCircle, Receipt as ReceiptIcon } from 'lucide-react';
import { useOffline, useOfflineCustomers } from './hooks/useOffline.js';
import { addToCart, setLineQty, removeFromCart, cartTotal, cartCount, buildOfflineOrder, clampQty } from './lib/pos.js';
import { addOrderTransaction, updateLocalOrder, saveReceiptToLocal } from './lib/db.js';
import { generateReceiptPDF, downloadPDFReceipt, printReceipt } from './lib/receipt.js';

const KENYAN_PHONE = /^(?:\+?254|0)(?:7|1)\d{8}$/;
const MPESA_CODE = /^[A-Z0-9]{6,20}$/;

function localReceiptNumber(orderId) {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `OD-${day}-${String(orderId).padStart(3, '0')}`;
}

function randomToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < 24; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export default function POSSalePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isOnline, backendDown, pendingCount, catalog, catalogSyncedAt,
    processOutbox,
  } = useOffline();
  const { customers } = useOfflineCustomers();

  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [qtyByService, setQtyByService] = useState({});
  const [selectedCustomerId, setSelectedCustomerId] = useState(location.state?.customerId || '');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaCode, setMpesaCode] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(null);
  const [printBlocked, setPrintBlocked] = useState(false);

  const offline = !isOnline || backendDown;

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (c) => c.serviceName.toLowerCase().includes(q) || (c.category || '').toLowerCase().includes(q)
    );
  }, [catalog, search]);

  const selectedCustomer = customers.find((customer) => String(customer.id) === String(selectedCustomerId));

  const total = cartTotal(cart);
  const count = cartCount(cart);

  function handleAdd(service) {
    const qty = clampQty(qtyByService[service.serviceName] || 1);
    setCart((prev) => addToCart(prev, service, qty));
    setQtyByService((prev) => ({ ...prev, [service.serviceName]: 1 }));
  }

  async function handleComplete() {
    setError('');
    setPrintBlocked(false);
    if (cart.length === 0) {
      setError('Your cart is empty. Add at least one service first.');
      return;
    }
    if (!selectedCustomer) {
      setError('Select a registered customer before saving the booking.');
      return;
    }
    const phone = selectedCustomer.phone.replace(/[\s-]/g, '');
    if (paymentMethod === 'M-Pesa' && !KENYAN_PHONE.test(mpesaPhone.replace(/[\s-]/g, ''))) {
      setError('Enter a valid Kenyan M-Pesa number (e.g. 0712 345 678).');
      return;
    }
    const normalizedMpesaCode = mpesaCode.trim().toUpperCase();
    if (paymentMethod === 'M-Pesa' && !MPESA_CODE.test(normalizedMpesaCode)) {
      setError('Enter a valid M-Pesa transaction code (letters and numbers only).');
      return;
    }
    setBusy(true);
    try {
      const name = selectedCustomer.name;
      const order = buildOfflineOrder({ cart, customerName: name, customerPhone: phone, customerId: selectedCustomer.externalId || null, customerClientId: selectedCustomer.clientId, paymentMethod, notes: notes.trim() });
      const payment = {
        orderId: null, // linked to the local order row below
        amount: total,
        method: paymentMethod,
        reference: paymentMethod === 'M-Pesa' ? normalizedMpesaCode : `${paymentMethod.toUpperCase()}-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      // Atomic: order + payment + outbox entries commit together.
      const { orderId } = await addOrderTransaction({ order, payment });

      // Sync immediately when possible; otherwise it waits in the outbox.
      if (!offline) {
        try {
          await processOutbox();
        } catch {
          // Outbox retry covers this; the sale is already durable.
        }
      }

      const receiptNumber = localReceiptNumber(orderId);
      const receiptToken = randomToken();
      // Itemized receipt generated from the actual cart snapshot (works
      // offline — jsPDF is bundled), then persisted for later re-access.
      const receiptSource = {
        id: orderId,
        name,
        phone,
        estimatedTotal: total,
        paymentMethod,
        status: order.status,
        items: order.items.map((i) => ({
          service: i.service,
          kg: i.kg,
          unitPrice: i.unitPrice,
          subtotal: i.subtotal,
        })),
        createdAt: order.createdAt,
      };
      const pdf = generateReceiptPDF(receiptSource, receiptNumber, receiptToken);
      try {
        // Receipt metadata only — never re-pends an already-synced sale.
        await updateLocalOrder(orderId, { receiptNumber, receiptToken }, { markPending: false });
      } catch {
        // Non-fatal: order itself is already durable.
      }
      try {
        await saveReceiptToLocal(orderId, receiptNumber, receiptToken, pdf.data);
      } catch {
        // Non-fatal: PDF regenerates deterministically from the order row.
      }
      setCompleted({
        orderId,
        receiptNumber,
        receiptToken,
        total,
        count,
        customer: name,
        paymentMethod,
        status: order.status,
        items: receiptSource.items,
        pdfData: pdf.data,
      });
      setCart([]);
    } catch {
      setError('Could not save this sale on the device. Nothing was lost from your cart — please try again.');
    } finally {
      setBusy(false);
    }
  }

  function handleDownloadPDF() {
    if (!completed) return;
    try {
      downloadPDFReceipt({ data: completed.pdfData, receiptNumber: completed.receiptNumber });
    } catch {
      setError('Could not generate the PDF. Please try printing instead.');
    }
  }

  function handlePrint() {
    if (!completed) return;
    const opened = printReceipt({
      receiptNumber: completed.receiptNumber,
      receiptToken: completed.receiptToken,
      name: completed.customer,
      estimatedTotal: completed.total,
      paymentMethod: completed.paymentMethod,
      status: completed.status,
      items: completed.items || [],
      createdAt: new Date().toISOString(),
    });
    setPrintBlocked(!opened);
  }

  if (completed) {
    return (
      <div className="pos-page sale-page">
        <header className="pos-page-header">
          <div>
            <p className="eyebrow">Booking complete</p>
            <h2>Booking saved on this device.</h2>
          </div>
        </header>
        <div className="sale-complete">
          <p className="sale-notice">
            <CheckCircle size={16} /> Receipt <b>{completed.receiptNumber}</b> · {completed.count} item(s) ·{' '}
            <b>KSh {completed.total.toLocaleString()}</b> · {completed.paymentMethod}
            {offline || pendingCount > 0
              ? ' · Will sync automatically when back online.'
              : ' · Synced.'}
          </p>
          {printBlocked && (
            <p className="sale-notice error" role="alert">
              <AlertCircle size={16} /> Printer popup was blocked — use Download PDF instead.
            </p>
          )}
          <div className="sale-actions">
            <button className="btn-primary" onClick={handleDownloadPDF}>
              <Download size={18} /> Download PDF receipt
            </button>
            <button className="btn-secondary" onClick={handlePrint}>
              <Printer size={18} /> Print receipt
            </button>
            <button className="btn-secondary" onClick={() => navigate('/orders')}>
              <ReceiptIcon size={18} /> View orders
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setCompleted(null);
                setSelectedCustomerId('');
                setMpesaPhone('');
                setMpesaCode('');
                setNotes('');
              }}
            >
              <Plus size={18} /> Start new booking
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-page sale-page">
      <header className="pos-page-header">
        <div>
          <p className="eyebrow">Bookings</p>
          <h2>Create a new booking</h2>
          <p className="booking-intro">Select services, confirm the customer, and save the booking.</p>
        </div>
        {offline && (
          <p className="sale-notice offline" role="status">
            <AlertCircle size={16} /> You are offline. Sales are saved on this device and will sync automatically.
          </p>
        )}
      </header>

      {error && (
        <p className="sale-notice error" role="alert">
          <AlertCircle size={16} /> {error}
        </p>
      )}

      <div className="sale-layout">
        <section className="sale-panel services-panel" aria-label="Services">
          <div className="booking-section-heading">
            <span className="booking-step">1</span>
            <div><h3>Select services</h3><p>Choose each service and its quantity.</p></div>
          </div>
          <div className="pos-search" style={{ marginBottom: 'var(--space-3)' }}>
            <Search size={18} />
            <input
              type="search"
              placeholder="Search services…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search services"
            />
          </div>
          {catalog.length === 0 ? (
            <p className="cart-empty">
              No price list on this device yet. Connect to the internet once to download it — the sale screen works fully offline after that.
            </p>
          ) : filteredCatalog.length === 0 ? (
            <p className="cart-empty">No services match “{search}”.</p>
          ) : (
            <div className="sale-services">
              {filteredCatalog.map((s) => (
                <article key={`${s.category}-${s.serviceName}`} className="sale-service-card">
                  <b>{s.serviceName}</b>
                  <span>{s.category}</span>
                  <span className="price">KSh {Number(s.unitPrice).toLocaleString()}</span>
                  <div className="qty-controls">
                    <button
                      type="button"
                      aria-label={`Decrease quantity for ${s.serviceName}`}
                      onClick={() =>
                        setQtyByService((p) => ({ ...p, [s.serviceName]: clampQty((p[s.serviceName] || 1) - 1) }))
                      }
                    >
                      −
                    </button>
                    <output aria-label="Quantity">{qtyByService[s.serviceName] || 1}</output>
                    <button
                      type="button"
                      aria-label={`Increase quantity for ${s.serviceName}`}
                      onClick={() =>
                        setQtyByService((p) => ({ ...p, [s.serviceName]: clampQty((p[s.serviceName] || 1) + 1) }))
                      }
                    >
                      +
                    </button>
                  </div>
                  <button type="button" className="btn-primary" onClick={() => handleAdd(s)}>
                    <Plus size={16} /> Add
                  </button>
                </article>
              ))}
            </div>
          )}
          {catalogSyncedAt && (
            <p className="cart-empty" style={{ marginTop: 'var(--space-3)' }}>
              Price list synced {new Date(catalogSyncedAt).toLocaleString()}
            </p>
          )}
        </section>

        <section className="sale-panel cart-panel" aria-label="Cart and checkout">
          <div className="booking-section-heading">
            <span className="booking-step">2</span>
            <div><h3>Booking details</h3><p>Review services and confirm customer details.</p></div>
          </div>
          <h4 className="booking-subheading">Selected services {count > 0 && `(${count})`}</h4>
          {cart.length === 0 ? (
            <p className="cart-empty">Cart is empty. Add services from the list.</p>
          ) : (
            <div className="cart-rows">
              {cart.map((l) => (
                <div key={l.key} className="cart-row">
                  <div>
                    <b>{l.service}</b>
                    <div className="qty-controls" style={{ marginTop: 'var(--space-1)' }}>
                      <button type="button" aria-label={`Decrease ${l.service}`} onClick={() => setCart((p) => setLineQty(p, l.key, l.qty - 1))}>
                        −
                      </button>
                      <output>{l.qty}</output>
                      <button type="button" aria-label={`Increase ${l.service}`} onClick={() => setCart((p) => setLineQty(p, l.key, l.qty + 1))}>
                        +
                      </button>
                    </div>
                  </div>
                  <span className="line-total">KSh {l.subtotal.toLocaleString()}</span>
                  <button type="button" className="remove-btn" onClick={() => setCart((p) => removeFromCart(p, l.key))}>
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="cart-totals">
            <div className="grand-total">
              <span>Total</span>
              <span>KSh {total.toLocaleString()}</span>
            </div>
          </div>

          <div className="booking-form-section">
            <h4>Customer and payment</h4>
          <div className="sale-field">
            <label htmlFor="sale-customer">Registered customer *</label>
            <select id="sale-customer" required value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}>
              <option value="">Select customer</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}
            </select>
            <small>Customer details can only be registered or changed from the Customers page.</small>
            {customers.length === 0 && <button type="button" className="btn-secondary" onClick={() => navigate('/customers')}>Register a customer</button>}
          </div>
          <div className="sale-field">
            <label htmlFor="sale-payment">Payment method</label>
            <select id="sale-payment" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="Cash">Cash{offline ? ' (works offline)' : ''}</option>
              <option value="M-Pesa">M-Pesa{offline ? ' (queued, confirmed when online)' : ''}</option>
              <option value="Draft">Draft{offline ? ' (works offline)' : ''}</option>
            </select>
          </div>
          {paymentMethod === 'M-Pesa' && (
            <div className="sale-field">
              <label htmlFor="sale-mpesa">M-Pesa number</label>
              <input
                id="sale-mpesa"
                type="tel"
                placeholder="0712 345 678"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                autoComplete="off"
              />
            </div>
          )}
          {paymentMethod === 'M-Pesa' && (
            <div className="sale-field">
              <label htmlFor="sale-mpesa-code">M-Pesa transaction code *</label>
              <input
                id="sale-mpesa-code"
                type="text"
                placeholder="e.g. QGH7X2ABCD"
                value={mpesaCode}
                onChange={(e) => setMpesaCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20))}
                autoCapitalize="characters"
                autoComplete="off"
                minLength={6}
                maxLength={20}
                required
              />
              <small>Enter the code shown in the customer’s M-Pesa confirmation message.</small>
            </div>
          )}
          <div className="sale-field">
            <label htmlFor="sale-notes">Notes (optional)</label>
            <input
              id="sale-notes"
              type="text"
              placeholder="e.g. Handle with care"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="sale-actions">
            <button type="button" className="btn-primary" onClick={handleComplete} disabled={busy || cart.length === 0}>
              {busy ? 'Saving…' : `Save booking · KSh ${total.toLocaleString()}`}
            </button>
          </div>
          </div>
        </section>
      </div>
    </div>
  );
}
