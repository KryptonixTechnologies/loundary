import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Download } from 'lucide-react';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-KE', { dateStyle: 'medium' });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
}

export default function ReceiptPage() {
  const navigate = useNavigate();
  const { token } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/receipts/${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error);
        return response.json();
      })
      .then((data) => {
        setReceipt(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  function handlePrint() {
    window.print();
  }

  function handleDownloadPDF() {
    if (!receipt) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Please allow popups to download the PDF.');
      return;
    }
    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Receipt ${receipt.receiptNumber}</title>
<style>
@page { size: 58mm; margin: 0; }
body { font-family: 'DM Sans', sans-serif; font-size: 11px; line-height: 1.4; margin: 12px; color: #09243f; }
.receipt-brand { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.receipt-brand h1 { font-size: 18px; margin: 0; }
.receipt-brand small { display: block; font-size: 9px; letter-spacing: 0.28em; color: #2f79ad; }
.receipt-header { text-align: center; margin-bottom: 12px; }
.receipt-meta { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 10px; }
.receipt-line { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px dashed #cbd8df; }
.receipt-line.heading { font-weight: 700; font-size: 9px; text-transform: uppercase; }
.receipt-total { display: flex; justify-content: space-between; font-weight: 800; padding: 6px 0; border-top: 2px solid #09243f; margin-top: 6px; }
.receipt-footer { text-align: center; margin-top: 12px; font-size: 9px; color: #607080; }
</style>
</head>
<body>
<div class="receipt-header">
<div class="receipt-brand">
  <img src="/assets/logo.jpg" alt="Open Doors" width="32" height="32" />
  <div><h1>OPEN DOORS</h1><small>LAUNDROMAT</small></div>
</div>
</div>
<p style="text-align:center;font-size:9px;color:#607080;margin-bottom:8px;">REQUEST RECEIPT &nbsp;|&nbsp; ${receipt.receiptNumber}</p>
<div class="receipt-meta">
<div><small>Customer:</small> <b>${receipt.name}</b></div>
<div><small>Phone:</small> <b>${receipt.phone}</b></div>
</div>
<div class="receipt-meta">
<div><small>Date:</small> <b>${formatDate(receipt.createdAt)} ${formatTime(receipt.createdAt)}</b></div>
<div><small>Status:</small> <b>${receipt.status}</b></div>
</div>
<h3 style="font-size:11px;margin:6px 0;">Services</h3>
${(receipt.items || []).map(item => `
<div class="receipt-line">
<span>${item.service} × ${item.kg}</span>
<b>KSh ${item.subtotal.toLocaleString()}</b>
</div>
`).join('')}
<div class="receipt-total">
<span>Total</span>
<b>KSh ${(receipt.estimatedTotal || 0).toLocaleString()}</b>
</div>
<div class="receipt-meta" style="margin-top:8px;">
<div><small>Payment:</small> <b>${receipt.paymentMethod || 'N/A'}</b></div>
<div><small>Method:</small> <b>${receipt.paymentMethod === 'M-Pesa' ? 'M-Pesa (' + receipt.mpesaPhone + ')' : 'Cash'}</b></div>
</div>
${receipt.location ? `<p style="font-size:9px;margin-top:6px;"><small>Pickup area:</small> <b>${receipt.location}</b></p>` : ''}
${receipt.notes ? `<p style="font-size:9px;"><small>Notes:</small> ${receipt.notes}</p>` : ''}
<div class="receipt-footer">
<p><b>Thank you for choosing Open Doors.</b></p>
<p>Chuna Mall · Shop 10 · Kitengela</p>
<p>011 944 4972</p>
</div>
</body>
</html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  if (loading) return (
    <main className="receipt-state">
      <p>Preparing your receipt…</p>
    </main>
  );

  if (error) return (
    <main className="receipt-state">
      <h1>{error}</h1>
      <button className="receipt-back" onClick={() => navigate('/')}>
        <ArrowLeft size={18} /> Back to website
      </button>
    </main>
  );

  return (
    <main className="receipt-page">
      <div className="receipt-actions">
        <button className="receipt-back" onClick={() => navigate('/')}>
          <ArrowLeft size={18} /> Website
        </button>
        <button onClick={handlePrint}><Printer size={18} /> Print</button>
        <button onClick={handleDownloadPDF}><Download size={18} /> Download PDF</button>
      </div>
      <article className="receipt">
        <header>
          <div className="receipt-brand">
            <span className="receipt-logo">
              <img src="/assets/logo.jpg" alt="Open Doors Laundromat logo" />
            </span>
            <div>
              <h1>OPEN DOORS</h1>
              <p>LAUNDROMAT</p>
            </div>
          </div>
          <div className="receipt-title">
            <span>REQUEST RECEIPT</span>
            <b>{receipt.receiptNumber}</b>
          </div>
        </header>
        <section className="receipt-meta">
          <div>
            <small>Issued to</small>
            <b>{receipt.name}</b>
            <span>{receipt.phone}</span>
          </div>
          <div>
            <small>Date issued</small>
            <b>{formatDate(receipt.createdAt)}</b>
            <span>{formatTime(receipt.createdAt)}</span>
          </div>
        </section>
        <section className="receipt-service">
          <div>
            <small>Requested services</small>
            <h2>{(receipt.items || []).length} item{(receipt.items || []).length !== 1 ? 's' : ''}</h2>
          </div>
          <span className={`receipt-status ${receipt.status}`}>{receipt.status}</span>
        </section>
        {(receipt.items || []).length ? (
          <section className="receipt-lines">
            <div className="receipt-line heading">
              <span>Service</span>
              <span>Kg / Qty</span>
              <span>Price</span>
              <span>Subtotal</span>
            </div>
            {(receipt.items || []).map((item, index) => (
              <div className="receipt-line" key={index}>
                <b>{item.service}</b>
                <span>{item.kg}</span>
                <span>KSh {item.priceLabel}</span>
                <b>KSh {item.subtotal.toLocaleString()}</b>
              </div>
            ))}
            <div className="receipt-total">
              <span>Estimated total</span>
              <b>KSh {(receipt.estimatedTotal || 0).toLocaleString()}</b>
            </div>
          </section>
        ) : null}
        <section className="receipt-details">
          <div className="receipt-payment">
            <small>Mode of payment</small>
            <p>
              <b>{receipt.paymentMethod || 'Not selected'}</b>
              {receipt.paymentMethod === 'M-Pesa' && receipt.mpesaPhone ? (
                <span>M-Pesa prompt number: {receipt.mpesaPhone}</span>
              ) : null}
            </p>
          </div>
          <div>
            <small>Pickup area</small>
            <p>{receipt.location || 'To be confirmed'}</p>
          </div>
          <div>
            <small>Additional details</small>
            <p>{receipt.notes || 'No additional details provided.'}</p>
          </div>
        </section>
        <footer>
          <div>
            <b>Thank you for choosing Open Doors.</b>
            <p>
              This receipt confirms your service request. Final charges are confirmed after item
              inspection.
            </p>
          </div>
          <div className="receipt-contact">
            <span>011 944 4972</span>
            <span>Chuna Mall · Shop 10 · Kitengela</span>
          </div>
        </footer>
      </article>
      <p className="receipt-footnote">So fresh, so clean, so you.</p>
    </main>
  );
}
