import React, { useEffect, useState } from 'react';

const statuses = ['new', 'confirmed', 'completed', 'cancelled'];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/admin/dashboard');

      if (!response.ok) {
        throw new Error('Failed to load orders');
      }

      const data = await response.json();
      setOrders(data.requests || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      const response = await fetch(`/api/admin/requests/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update order');
      }

      setOrders(current =>
        current.map(order =>
          order.id === id ? { ...order, status: data.status } : order
        )
      );
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="page-loading">Loading orders...</div>;

  if (error) {
    return (
      <div className="page-container">
        <p>{error}</p>
        <button onClick={loadOrders}>Try Again</button>
      </div>
    );
  }

  return (
    <main className="page-container">
      <section className="page-header">
        <h1>Orders</h1>
        <p>Manage customer laundry requests.</p>
      </section>

      <div className="orders-table-wrapper">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Receipt</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Service</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>{order.receiptNumber}</td>
                <td>{order.name}</td>
                <td>{order.phone}</td>
                <td>{order.service}</td>
                <td>KES {Number(order.estimatedTotal || 0).toLocaleString()}</td>
                <td>{order.paymentMethod}</td>
                <td>
                  <select
                    value={order.status}
                    onChange={e =>
                      updateStatus(order.id, e.target.value)
                    }
                  >
                    {statuses.map(status => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {orders.length === 0 && (
          <p className="empty-state">No orders found.</p>
        )}
      </div>
    </main>
  );
}