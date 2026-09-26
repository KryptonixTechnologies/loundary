import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'open-doors-offline-orders';

export default function OfflinePOSPage() {
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setOrders(saved);
    } catch {
      setOrders([]);
    }
  }, []);

  const addOrder = () => {
    const order = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'pending-sync',
    };

    const updated = [order, ...orders];

    setOrders(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setMessage('Offline order saved on this device.');
  };

  const clearOrders = () => {
    localStorage.removeItem(STORAGE_KEY);
    setOrders([]);
    setMessage('Offline orders cleared.');
  };

  return (
    <main className="page-container">
      <section className="page-header">
        <h1>Offline POS</h1>
        <p>Create and keep POS records when the internet is unavailable.</p>
      </section>

      <div className="offline-pos-actions">
        <button onClick={addOrder}>Save Offline Order</button>
        <button onClick={clearOrders}>Clear Offline Orders</button>
      </div>

      {message && <p>{message}</p>}

      <div className="orders-table-wrapper">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Offline ID</th>
              <th>Created</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{new Date(order.createdAt).toLocaleString()}</td>
                <td>{order.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}