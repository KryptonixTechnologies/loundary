import React, { useEffect, useMemo, useState } from 'react';

export default function PaymentsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load payments');
        }

        return data;
      })
      .then((data) => {
        setOrders(data.requests || []);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const totals = useMemo(() => {
    return orders.reduce(
      (result, order) => {
        const amount = Number(order.estimatedTotal || 0);

        result.total += amount;

        if (order.paymentMethod === 'M-Pesa') {
          result.mpesa += amount;
        }

        if (order.paymentMethod === 'Cash') {
          result.cash += amount;
        }

        if (order.paymentStatus === 'paid') {
          result.paid += amount;
        }

        return result;
      },
      {
        total: 0,
        mpesa: 0,
        cash: 0,
        paid: 0,
      }
    );
  }, [orders]);

  if (loading) {
    return (
      <main className="page-container">
        <p>Loading payments...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-container">
        <h1>Payments</h1>
        <p>{error}</p>
      </main>
    );
  }

  return (
    <main className="page-container">
      <section className="page-header">
        <h1>Payments</h1>
        <p>Track customer payments and payment methods.</p>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <span>Total Orders Value</span>
          <strong>
            KES {totals.total.toLocaleString()}
          </strong>
        </div>

        <div className="stat-card">
          <span>M-Pesa</span>
          <strong>
            KES {totals.mpesa.toLocaleString()}
          </strong>
        </div>

        <div className="stat-card">
          <span>Cash</span>
          <strong>
            KES {totals.cash.toLocaleString()}
          </strong>
        </div>

        <div className="stat-card">
          <span>Marked Paid</span>
          <strong>
            KES {totals.paid.toLocaleString()}
          </strong>
        </div>
      </section>

      <div className="orders-table-wrapper">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Receipt</th>
              <th>Customer</th>
              <th>Payment Method</th>
              <th>M-Pesa Phone</th>
              <th>Amount</th>
              <th>Payment Status</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.receiptNumber}</td>

                <td>
                  <strong>{order.name}</strong>
                  <br />
                  <small>{order.phone}</small>
                </td>

                <td>{order.paymentMethod}</td>

                <td>
                  {order.mpesaPhone || '-'}
                </td>

                <td>
                  KES{' '}
                  {Number(
                    order.estimatedTotal || 0
                  ).toLocaleString()}
                </td>

                <td>
                  {order.paymentStatus || 'pending'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {orders.length === 0 && (
          <p className="empty-state">
            No payments found.
          </p>
        )}
      </div>
    </main>
  );
}