import React, { useEffect, useMemo, useState } from 'react';

export default function CustomersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load customers');
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

  const customers = useMemo(() => {
    const customerMap = new Map();

    orders.forEach((order) => {
      const key = order.phone || order.name;

      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: order.name,
          phone: order.phone,
          location: order.location || '-',
          orders: 0,
          total: 0,
          lastOrder: order.createdAt,
        });
      }

      const customer = customerMap.get(key);

      customer.orders += 1;
      customer.total += Number(order.estimatedTotal || 0);

      if (
        new Date(order.createdAt) > new Date(customer.lastOrder)
      ) {
        customer.lastOrder = order.createdAt;
      }
    });

    return Array.from(customerMap.values()).sort(
      (a, b) => b.orders - a.orders
    );
  }, [orders]);

  if (loading) {
    return (
      <main className="page-container">
        <p>Loading customers...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-container">
        <h1>Customers</h1>
        <p>{error}</p>
      </main>
    );
  }

  return (
    <main className="page-container">
      <section className="page-header">
        <h1>Customers</h1>
        <p>View customers based on their laundry orders.</p>
      </section>

      <div className="orders-table-wrapper">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Location</th>
              <th>Orders</th>
              <th>Total Spent</th>
              <th>Last Order</th>
            </tr>
          </thead>

          <tbody>
            {customers.map((customer) => (
              <tr
                key={`${customer.phone}-${customer.name}`}
              >
                <td>{customer.name}</td>
                <td>{customer.phone}</td>
                <td>{customer.location}</td>
                <td>{customer.orders}</td>
                <td>
                  KES {customer.total.toLocaleString()}
                </td>
                <td>
                  {new Date(
                    customer.lastOrder
                  ).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {customers.length === 0 && (
          <p className="empty-state">
            No customers found.
          </p>
        )}
      </div>
    </main>
  );
}