'use client';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from '../lib/navigation';
import api from '../api/axios';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-PK')}`;
const titleCase = (value) => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function Orders({ seller = false }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    try {
      const { data } = await api.get(seller ? '/orders/seller' : '/orders/mine', { headers: { Authorization: `Bearer ${token}` } });
      setOrders(data.orders || []);
    } catch (err) {
      if (err.response?.status === 401) navigate('/login');
      else setError(err.response?.data?.message || 'Orders could not be loaded.');
    } finally { setLoading(false); }
  }, [navigate, seller]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (orderId, productId, status) => {
    try {
      await api.patch(`/orders/${orderId}/items/${productId}/status`, { status }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      await load();
    } catch (err) { setError(err.response?.data?.message || 'Status could not be changed.'); }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.assign('/');
  };

  return <main className="orders-page">
    <header className="orders-top">
      <Link className="brand" to="/">market<span>hub</span><i>®</i></Link>
      <div><Link to={seller ? '/dashboard' : '/'}>{seller ? 'Seller dashboard' : 'Marketplace'} ↗</Link>{seller && <Link to="/orders">My purchases</Link>}<button className="logout-button" type="button" onClick={logout}>Log out</button></div>
    </header>
    <section className="orders-content">
      <span className="eyebrow">{seller ? 'YOUR SHOP' : 'YOUR MARKETPLACE ACCOUNT'}</span>
      <h1>{seller ? 'Orders to fulfill.' : 'Your orders.'}</h1>
      <p>{seller ? 'Pack and update the products sold by your shop.' : 'A little history of the good things you have found.'}</p>
      {error && <div className="form-alert" role="alert">{error}</div>}
      {loading ? <div className="loading-page">Loading orders…</div> : orders.length ? <div className="orders-list">{orders.map((order) => <article className="order-card" key={order._id}>
        <div className="order-heading"><div><strong>Order #{order._id.slice(-7).toUpperCase()}</strong><span>{new Date(order.createdAt).toLocaleDateString()}</span></div><span className="order-payment">{titleCase(order.paymentMethod)} · {titleCase(order.paymentStatus)}</span></div>
        {seller && <div className="order-customer"><strong>{order.customerName}</strong><span>{order.phone} · {order.address}</span></div>}
        <div className="order-lines">{order.items.map((item, index) => <div className="order-line" key={`${item.product}-${index}`}>
          <img src={item.imageUrl} alt="" />
          <div className="order-line-info"><strong>{item.name}</strong><span>{item.quantity} × {money(item.unitPrice)}{!seller && item.store?.name ? ` · ${item.store.name}` : ''}</span></div>
          <div className="order-line-end"><b>{money(item.quantity * item.unitPrice)}</b>{seller ? <label className="status-select">{titleCase(item.fulfillmentStatus)}<select value={item.fulfillmentStatus === 'new' ? 'new' : item.fulfillmentStatus} onChange={(event) => updateStatus(order._id, item.product, event.target.value)}><option value="new" disabled>New</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option></select></label> : <span>{titleCase(item.fulfillmentStatus || order.status)}</span>}</div>
        </div>)}</div>
        {!seller && <div className="order-total"><span>Order total</span><strong>{money(order.total)}</strong></div>}
      </article>)}</div> : <div className="orders-empty"><span>✳</span><h2>{seller ? 'No orders just yet.' : 'Your first good find is waiting.'}</h2><p>{seller ? 'Orders for products in your shop will show up here.' : 'Browse independent shops and discover something you love.'}</p><Link className="button button-dark" to={seller ? '/products' : '/'}>{seller ? 'Manage products' : 'Explore the market'} <span>↗</span></Link></div>}
    </section>
  </main>;
}
