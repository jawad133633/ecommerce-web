'use client';
import { useEffect, useMemo, useState } from 'react';
import { Link } from '../lib/navigation';
import api from '../api/axios';
import MarketHeader from '../components/MarketHeader';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-PK')}`;
export default function Cart() {
  const [items, setItems] = useState([]); const [hydrated, setHydrated] = useState(false); const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [form, setForm] = useState({ customerName: '', phone: '', address: '' }); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const groupedItems = useMemo(() => {
    const groups = new Map();
    items.forEach((item) => {
      const key = String(item.productId || `${item.name}-${item.storeName}`);
      const group = groups.get(key);
      if (group) group.quantity += 1;
      else groups.set(key, { ...item, key, quantity: 1 });
    });
    return [...groups.values()];
  }, [items]);
  const subtotal = groupedItems.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0);
  useEffect(() => { try { setItems(JSON.parse(localStorage.getItem('markethub-cart-items') || '[]')); } catch { setItems([]); } setIsLoggedIn(Boolean(localStorage.getItem('token'))); setHydrated(true); }, []);
  useEffect(() => { if (!hydrated) return; localStorage.setItem('markethub-cart', String(items.length)); localStorage.setItem('markethub-cart-items', JSON.stringify(items)); window.dispatchEvent(new Event('market-cart-updated')); }, [items, hydrated]);
  const changeQuantity = (key, change) => setItems((current) => {
    const indexes = current.map((item, index) => String(item.productId || `${item.name}-${item.storeName}`) === key ? index : -1).filter((index) => index >= 0);
    if (!indexes.length) return current;
    if (change > 0) return [...current, { ...current[indexes[0]] }];
    if (indexes.length === 1) return current.filter((_, index) => index !== indexes[0]);
    const removeIndex = indexes[indexes.length - 1];
    return current.filter((_, index) => index !== removeIndex);
  });
  const remove = (key) => setItems(current => current.filter((item) => String(item.productId || `${item.name}-${item.storeName}`) !== key));
  const submit = async (event) => { event.preventDefault(); setError(''); const token = localStorage.getItem('token'); if (!token) { window.location.href='/login?next=%2Fcart'; return; } setBusy(true); try { await api.post('/orders', {...form, items: groupedItems.map(i => ({productId:i.productId, quantity:i.quantity}))}, {headers:{Authorization:`Bearer ${token}`}}); setItems([]); window.location.href='/orders'; } catch(err) { setError(err.response?.data?.message || 'Your order could not be placed. Please try again.'); } finally {setBusy(false);} };
  return <div className="marketplace"><MarketHeader/><main className="cart-page"><div className="detail-breadcrumb"><Link to="/">Home</Link><span> / </span>Your bag</div><header className="cart-page-heading"><span className="eyebrow">A FEW GOOD FINDS</span><h1>Your bag <em>({items.length})</em></h1><p>Good things are better when they find their way home.</p></header>{items.length ? <div className="cart-layout"><section className="cart-list">{groupedItems.map((item)=><article className="cart-page-item" key={item.key}><img src={item.imageUrl} alt={item.name}/><div className="cart-item-summary"><span className="eyebrow">{item.storeName || 'INDEPENDENT SHOP'}</span><h2>{item.name}</h2><span className="cart-item-unit">{money(item.price)} each</span><div className="cart-item-quantity"><button type="button" onClick={() => changeQuantity(item.key, -1)} aria-label={`Remove one ${item.name}`}>−</button><span>{item.quantity}</span><button type="button" onClick={() => changeQuantity(item.key, 1)} aria-label={`Add one ${item.name}`}>＋</button></div><strong className="cart-item-line-total">{money(Number(item.price) * item.quantity)}</strong></div><button className="cart-item-remove" onClick={()=>remove(item.key)} aria-label={`Remove all ${item.name} from bag`}>Remove ×</button></article>)}<Link className="text-link" to="/discover">← Keep discovering</Link></section><form className="cart-checkout" onSubmit={submit}><div className="cart-total"><span>Subtotal · {items.length} items</span><strong>{money(subtotal)}</strong></div><p>Delivery details</p><label>Your name<input required autoComplete="name" value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})}/></label><label>Phone number<input required autoComplete="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Delivery address<textarea required autoComplete="street-address" rows="3" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label><span className="payment-label">Payment method</span><div className="payment-choice">Cash on delivery</div>{error && <div className="form-alert" role="alert">{error}</div>}<button className="create-submit" disabled={busy}>{busy ? 'Placing your order…' : isLoggedIn ? 'Place order · ' + money(subtotal) : 'Log in to continue'}</button>{!isLoggedIn && <small>We’ll keep your bag when you log in.</small>}</form></div> : <section className="cart-empty cart-page-empty"><span>✳</span><h2>Your bag is waiting for something lovely.</h2><p>Find thoughtful pieces from independent shops and makers.</p><Link className="button button-dark" to="/discover">Explore the marketplace <span>↗</span></Link></section>}</main></div>;
}
