'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Link, useNavigate } from '../lib/navigation';
import api from '../api/axios';
import AdminWorkspaceSection from './AdminWorkspaceSection';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-PK')}`;
const title = (value) => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
const blankProduct = { name: '', description: '', price: '', category: '', stock: 0, imageUrl: '', imagePublicId: '', store: '', isAvailable: true };

function Icon({ name }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    bag: <><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/></>,
    people: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-5 5"/></>,
    payment: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.9h-2.8l-.3-1.9a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.9h2.8l.3 1.9a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z"/></>,
    out: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function SalesChart({ data = [], metricLabel = 'Daily sales revenue', formatValue = money, formatDate }) {
  const width = 720; const height = 210; const pad = 18;
  const max = Math.max(1, ...data.map((item) => Number(item.value ?? item.revenue ?? 0)));
  const points = data.map((item, index) => ({ ...item, value: Number(item.value ?? item.revenue ?? 0), x: pad + (data.length <= 1 ? 0 : index * (width - pad * 2) / (data.length - 1)), y: height - pad - (Number(item.value ?? item.revenue ?? 0) / max) * (height - pad * 2) }));
  const line = points.map(({ x, y }, index) => `${index ? 'L' : 'M'}${x},${y}`).join(' ');
  const area = points.length ? `${line} L${points.at(-1).x},${height - pad} L${points[0].x},${height - pad} Z` : '';
  return <div className="admin-chart-wrap"><svg className="admin-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={metricLabel}>
    {[0, 1, 2].map((row) => <line key={row} x1={pad} x2={width - pad} y1={pad + row * (height - pad * 2) / 2} y2={pad + row * (height - pad * 2) / 2} className="admin-chart-grid"/>)}
    <path d={area} className="admin-chart-area"/><path d={line} className="admin-chart-line"/>
    {points.map((point) => <circle key={point.date} cx={point.x} cy={point.y} r="4" className="admin-chart-dot"><title>{point.date}: {formatValue(point.value)}</title></circle>)}
  </svg><div className="admin-chart-labels">{data.map((item) => <span key={item.date}>{formatDate ? formatDate(item.date) : new Date(`${item.date}T00:00:00`).toLocaleDateString('en', { weekday: 'short' })}</span>)}</div></div>;
}

export default function Admin() {
  const pathname = usePathname();
  const navigate = useNavigate();
  const section = ['products', 'orders', 'reports', 'payments', 'customers', 'settings'].find((item) => pathname.endsWith(`/${item}`)) || 'overview';
  const [token, setToken] = useState(''); const [user, setUser] = useState(null);
  const [overview, setOverview] = useState(null); const [orders, setOrders] = useState([]); const [products, setProducts] = useState([]); const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [orderPage, setOrderPage] = useState(1); const [orderPages, setOrderPages] = useState(1); const [orderQuery, setOrderQuery] = useState(''); const [appliedOrderQuery, setAppliedOrderQuery] = useState(''); const [orderFrom, setOrderFrom] = useState(''); const [orderTo, setOrderTo] = useState(''); const [orderPayment, setOrderPayment] = useState(''); const [appliedOrderDates, setAppliedOrderDates] = useState({});
  const [statusFilter, setStatusFilter] = useState('all'); const [query, setQuery] = useState(''); const [editing, setEditing] = useState(null); const [form, setForm] = useState(blankProduct); const [uploading, setUploading] = useState(false);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const load = useCallback(async (authToken = token) => {
    if (!authToken) return;
    const auth = { headers: { Authorization: `Bearer ${authToken}` } };
    setLoading(true); setError(''); setAccessDenied(false);
    try {
      if (section === 'overview') {
        const { data } = await api.get('/admin/overview', auth); setOverview(data);
      } else if (section === 'orders') {
        const { data } = await api.get('/admin/orders', { ...auth, params: { limit: 20, page: orderPage, ...(statusFilter !== 'all' ? { status: statusFilter } : {}), ...(appliedOrderQuery ? { search: appliedOrderQuery } : {}), ...appliedOrderDates } }); setOrders(data.orders || []); setOrderPages(data.pages || 1);
      } else if (section === 'products') {
        const { data } = await api.get('/admin/products', auth); setProducts(data.products || []); setStores(data.stores || []);
      }
    } catch (err) {
      if (err.response?.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/admin/login?next=/admin'); }
      else { setAccessDenied(err.response?.status === 403); setError(err.response?.data?.message || 'We could not load this section.'); }
    } finally { setLoading(false); }
  }, [appliedOrderDates, appliedOrderQuery, navigate, orderPage, section, statusFilter, token]);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    let savedUser = null; try { savedUser = JSON.parse(localStorage.getItem('user') || 'null'); } catch {}
    if (!savedToken) { navigate('/admin/login?next=/admin'); return; }
    setToken(savedToken); setUser(savedUser);
  }, [navigate]);
  useEffect(() => { if (token && ['overview', 'orders', 'products'].includes(section)) load(); }, [load, section, token]);

  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/admin/login'); };
  const updateStatus = async (id, status) => {
    setError(''); setNotice('');
    try { await api.patch(`/admin/orders/${id}/status`, { status }, { headers }); await load(); setNotice('Order status updated.'); }
    catch (err) { setError(err.response?.data?.message || 'Order status could not be updated.'); }
  };

  const openCreate = () => { setEditing(null); setForm({ ...blankProduct, store: stores[0]?._id || '' }); setNotice(''); };
  const openEdit = (product) => { setEditing(product._id); setForm({ ...blankProduct, ...product, store: product.store?._id || product.store, price: String(product.price), stock: String(product.stock) }); setNotice(''); };
  const saveProduct = async (event) => {
    event.preventDefault(); setError(''); setNotice(''); setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock) };
      if (editing) await api.patch(`/admin/products/${editing}`, payload, { headers });
      else await api.post('/admin/products', payload, { headers });
      setNotice(editing ? 'Product updated.' : 'Product added to the storefront.'); setEditing(null); setForm(blankProduct); await load();
    } catch (err) { setError(err.response?.data?.message || 'Product could not be saved.'); }
    finally { setSaving(false); }
  };
  const uploadImage = async (file) => {
    if (!file) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Choose a JPG, PNG, WebP, or AVIF image up to 5 MB.'); return; }
    setUploading(true);
    try { const body = new FormData(); body.append('image', file); const { data } = await api.post('/admin/products/upload-image', body, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }); setForm((old) => ({ ...old, imageUrl: data.imageUrl, imagePublicId: data.publicId })); }
    catch (err) { setError(err.response?.data?.message || 'Image upload failed.'); }
    finally { setUploading(false); }
  };
  const deleteProduct = async (product) => {
    if (!window.confirm(`Delete “${product.name}” from the storefront?`)) return;
    setError(''); setNotice('');
    try { await api.delete(`/admin/products/${product._id}`, { headers }); setProducts((items) => items.filter((item) => item._id !== product._id)); setNotice('Product deleted.'); }
    catch (err) { setError(err.response?.data?.message || 'Product could not be deleted.'); }
  };
  const visibleProducts = products.filter((product) => `${product.name} ${product.category} ${product.store?.name || ''}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="brand" to="/">market<span>hub</span><i>®</i></Link><div className="admin-sidebar-label">WORKSPACE</div>
    <nav className="admin-nav" aria-label="Admin navigation">
        {[['overview', 'Overview', 'grid', '/admin'], ['orders', 'Orders', 'bag', '/admin/orders'], ['products', 'Products', 'box', '/admin/products'], ['customers', 'Customers', 'people', '/admin/customers'], ['reports', 'Sales reports', 'chart', '/admin/reports'], ['payments', 'Payments', 'payment', '/admin/payments'], ['settings', 'Security', 'settings', '/admin/settings']].map(([key, label, icon, href]) => <Link key={key} className={section === key ? 'active' : ''} href={href}><Icon name={icon}/>{label}</Link>)}
      </nav>
      <div className="admin-sidebar-bottom"><div className="admin-user-avatar">{user?.name?.slice(0, 1) || 'A'}</div><div className="admin-user"><strong>{user?.name || 'Administrator'}</strong><span>Store administrator</span></div><button type="button" aria-label="Log out" onClick={logout}><Icon name="out"/></button></div>
    </aside>
    <main className="admin-main">
      <header className="admin-topbar"><div><span className="admin-breadcrumb">MARKETHUB <span>/</span> {section.toUpperCase()}</span><h1>{section === 'overview' ? 'Store overview' : title(section)}</h1></div><div className="admin-top-actions"><span className="admin-connection">Admin workspace</span><Link href="/">View storefront <span>↗</span></Link></div></header>
      <div className="admin-content">
        {error && <div className="admin-alert error" role="alert">{error}</div>}{notice && <div className="admin-alert success" role="status">{notice}</div>}
        {['customers', 'reports', 'payments', 'settings'].includes(section) ? token && <AdminWorkspaceSection section={section} token={token} user={user} onLogout={logout}/> : loading ? <div className="admin-loading"><span/>Loading store data…</div> : accessDenied ? <section className="admin-card"><span className="admin-kicker">ADMIN ACCESS REQUIRED</span><h2>This account cannot manage the store.</h2><p>Sign in with an administrator account. A customer or seller login does not grant access to orders, products, or sales data.</p><Link className="admin-secondary-button" href="/admin/login">Go to admin sign in</Link></section> : section === 'overview' ? <>
          <div className="admin-welcome-row"><div><h2>Your store at a glance{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.</h2><p>Here’s what’s happening across MarketHub today.</p></div><span className="admin-updated">Updated {overview?.updatedAt ? new Date(overview.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span></div>
          <section className="admin-revenue-summary" aria-label="Store sales totals">
            <div className="admin-revenue-primary"><span className="admin-kicker">TOTAL STORE SALES</span><h2>Active order value</h2><strong>{money(overview?.metrics?.orderValue)}</strong><p>Combined value of orders excluding cancelled and fully refunded orders.</p></div>
            <div className="admin-revenue-breakdown"><article><span>Collected revenue</span><strong>{money(overview?.metrics?.revenue)}</strong><small>Recorded payments, less refunds</small></article><article><span>Awaiting collection</span><strong>{money(overview?.metrics?.pendingCollection)}</strong><small>Unpaid or pending orders</small></article></div>
          </section>
          <section className="admin-metrics admin-overview-counts" aria-label="Store metrics">
            {[['Orders', overview?.metrics?.orders || 0, 'All time'], ['Customers', overview?.metrics?.customers || 0, 'Registered accounts'], ['Products', overview?.metrics?.products || 0, `${overview?.metrics?.lowStock || 0} low in stock`]].map(([label, value, hint], index) => <article className="admin-metric" key={label}><div><span>{label}</span><i className={`metric-icon mi-${index + 1}`}>{['↗', '◎', '▧'][index]}</i></div><strong>{value}</strong><small>{hint}</small></article>)}
          </section>
          <div className="admin-overview-grid"><section className="admin-card admin-sales-card"><div className="admin-card-heading"><div><span className="admin-kicker">PAYMENT PERFORMANCE</span><h2>Collected revenue</h2></div><span className="admin-period">Last 7 days</span></div><div className="admin-chart-total">{money((overview?.sales || []).reduce((sum, day) => sum + day.revenue, 0))}<span> collected after refunds</span></div><SalesChart data={overview?.sales || []} metricLabel="Collected revenue for the last seven days"/></section>
            <section className="admin-card admin-health-card"><div className="admin-card-heading"><div><span className="admin-kicker">INVENTORY HEALTH</span><h2>Stock watch</h2></div><Link href="/admin/products">View all ↗</Link></div><div className="admin-stock-number">{overview?.metrics?.lowStock || 0}<span> products need a restock</span></div><div className="admin-stock-meter"><i style={{ width: `${Math.min(100, (overview?.metrics?.lowStock || 0) * 10)}%` }}/></div><p>Products with five or fewer items remaining</p><Link className="admin-secondary-button" href="/admin/products">Manage inventory <span>→</span></Link></section></div>
          <section className="admin-card admin-recent-card"><div className="admin-card-heading"><div><span className="admin-kicker">THE LATEST</span><h2>Recent orders</h2></div><Link href="/admin/orders">All orders <span>↗</span></Link></div><OrderRows orders={overview?.recentOrders || []} compact onStatus={updateStatus}/></section>
        </> : section === 'orders' ? <>
          <div className="admin-section-intro"><div><h2>Keep every order moving.</h2><p>Update a status here and customers see the change in their order tracking.</p></div><form className="admin-order-filters" onSubmit={(event) => { event.preventDefault(); setOrderPage(1); setAppliedOrderQuery(orderQuery.trim()); setAppliedOrderDates({ ...(orderFrom ? { from: orderFrom } : {}), ...(orderTo ? { to: orderTo } : {}), ...(orderPayment ? { paymentStatus: orderPayment } : {}) }); }}><input aria-label="Search order or customer" value={orderQuery} onChange={(event) => setOrderQuery(event.target.value)} placeholder="Order, customer, phone…"/><input aria-label="Orders from date" type="date" value={orderFrom} onChange={(event) => setOrderFrom(event.target.value)}/><input aria-label="Orders to date" type="date" value={orderTo} onChange={(event) => setOrderTo(event.target.value)}/><label className="admin-select-label">Payment <select value={orderPayment} onChange={(event) => setOrderPayment(event.target.value)}><option value="">All payments</option>{['unpaid', 'pending', 'paid', 'failed', 'refunded'].map((status) => <option value={status} key={status}>{title(status)}</option>)}</select></label><button className="admin-secondary-button">Search</button><label className="admin-select-label">Status <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setOrderPage(1); }}><option value="all">All orders</option>{statuses.map((status) => <option value={status} key={status}>{title(status)}</option>)}</select></label></form></div>
          <section className="admin-card admin-table-card"><OrderRows orders={orders} onStatus={updateStatus}/></section>
          <div className="admin-pager"><button type="button" className="admin-secondary-button" disabled={orderPage <= 1 || loading} onClick={() => setOrderPage((page) => page - 1)}>Previous</button><span>Page {orderPage} of {orderPages}</span><button type="button" className="admin-secondary-button" disabled={orderPage >= orderPages || loading} onClick={() => setOrderPage((page) => page + 1)}>Next</button></div>
        </> : <>
          <div className="admin-section-intro"><div><h2>Your product catalogue.</h2><p>Product edits sync to customer listings and product detail pages.</p></div><button className="admin-primary-button" onClick={openCreate} disabled={!stores.length}>＋ Add product</button></div>
          {!stores.length && <div className="admin-alert error">Create a seller store before adding products.</div>}
          {(editing !== null || form.name || form.store) && <section className="admin-card admin-product-form-card"><div className="admin-card-heading"><div><span className="admin-kicker">{editing ? 'EDIT LISTING' : 'NEW LISTING'}</span><h2>{editing ? 'Update product' : 'Add a product'}</h2></div><button className="admin-text-button" type="button" onClick={() => { setEditing(null); setForm(blankProduct); }}>Close ×</button></div>
            <form className="admin-product-form" onSubmit={saveProduct}>
              <label>Product name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} required/></label>
              <label>Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={80} required/></label>
              <label>Price (Rs.)<input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required/></label>
              <label>Stock quantity<input type="number" min="0" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required/></label>
              {!editing && <label>Store<select value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })} required><option value="">Choose a store</option>{stores.map((store) => <option value={store._id} key={store._id}>{store.name}</option>)}</select></label>}
              <label className="admin-upload-field">Product image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => uploadImage(e.target.files?.[0])}/><span>{uploading ? 'Uploading securely to Cloudinary…' : 'JPG, PNG, WebP or AVIF · Up to 5 MB'}</span></label>
              <label className="admin-wide">Image URL<input type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="Upload an image or paste an HTTPS URL"/></label>
              {form.imageUrl && <div className="admin-image-preview"><img src={form.imageUrl} alt="Product preview"/></div>}
              <label className="admin-wide">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={2000} rows={3}/></label>
              <label className="admin-availability"><input type="checkbox" checked={form.isAvailable !== false} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}/> Show in customer storefront</label>
              <div className="admin-wide admin-form-actions"><button type="button" className="admin-secondary-button" onClick={() => { setEditing(null); setForm(blankProduct); }}>Cancel</button><button className="admin-primary-button" disabled={saving || uploading}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create product'}</button></div>
            </form>
          </section>}
          <section className="admin-card admin-products-card"><div className="admin-card-heading"><div><span className="admin-kicker">CATALOGUE</span><h2>All products <span className="admin-count">{products.length}</span></h2></div><input className="admin-search" aria-label="Search products" placeholder="Search products…" value={query} onChange={(e) => setQuery(e.target.value)}/></div>
            <div className="admin-products-list">{visibleProducts.length ? visibleProducts.map((product) => <article className="admin-product-row" key={product._id}><div className="admin-product-thumb">{product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy"/> : <Icon name="box"/>}</div><div className="admin-product-name"><strong>{product.name}</strong><span>{product.category} · {product.store?.name || 'No store'}</span></div><div className="admin-product-price">{money(product.price)}</div><div className={`admin-stock ${product.stock <= 5 ? 'low' : ''}`}>{product.stock} in stock</div><span className={`admin-availability-pill ${product.isAvailable === false ? 'off' : ''}`}>{product.isAvailable === false ? 'Hidden' : 'Live'}</span><div className="admin-row-actions"><button type="button" onClick={() => openEdit(product)}>Edit</button><button type="button" className="danger" onClick={() => deleteProduct(product)}>Delete</button></div></article>) : <div className="admin-empty">No products match that search.</div>}</div>
          </section>
        </>}
      </div>
    </main>
  </div>;
}

function OrderRows({ orders = [], compact = false, onStatus }) {
  if (!orders.length) return <div className="admin-empty">No orders to show yet.</div>;
  return <div className="admin-order-list">{!compact && <div className="admin-order-head"><span>ORDER</span><span>CUSTOMER</span><span>DATE</span><span>PAYMENT</span><span>TOTAL</span><span>STATUS</span></div>}{orders.map((order) => <article className={`admin-order-row ${compact ? 'compact' : ''}`} key={order._id}>
    <div className="admin-order-id"><strong>#{String(order._id).slice(-7).toUpperCase()}</strong><span>{order.items?.length || 0} line items</span></div>
    <div className="admin-customer"><strong>{order.customerName || order.buyer?.name || 'Customer'}</strong><span>{order.buyer?.email || order.phone || ''}</span></div>
    <div className="admin-order-date">{new Date(order.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
    <div className="admin-payment"><span>{title(order.paymentMethod || 'cash_on_delivery')}</span><small>{title(order.paymentStatus || 'unpaid')}</small></div>
    <strong className="admin-order-total">{money(order.total)}</strong>
    <select aria-label={`Status for order ${String(order._id).slice(-7)}`} className={`admin-status-select status-${order.status || 'pending'}`} value={order.status || 'pending'} onChange={(event) => onStatus(order._id, event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{title(status)}</option>)}</select>
    {order.status === 'shipped' && <button type="button" className="admin-deliver-button" onClick={() => onStatus(order._id, 'delivered')}>Mark delivered</button>}
    <details className="admin-order-details"><summary>Details</summary><div className="admin-detail-panel"><p><strong>Ship to:</strong> {order.customerName}, {order.phone}<br/>{order.address}</p>{order.items?.map((item, index) => <div key={`${item.product}-${index}`}><span>{item.name} × {item.quantity}</span><span>{money(item.unitPrice * item.quantity)}</span></div>)}<div><span>Subtotal</span><span>{money(order.subtotal ?? order.items?.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))}</span></div>{Number(order.discountAmount) > 0 && <div><span>Discount</span><span>−{money(order.discountAmount)}</span></div>}{Number(order.shippingAmount) > 0 && <div><span>Shipping</span><span>{money(order.shippingAmount)}</span></div>}{Number(order.taxAmount) > 0 && <div><span>Tax</span><span>{money(order.taxAmount)}</span></div>}<div><strong>Total</strong><strong>{money(order.total)}</strong></div><p><strong>Payment:</strong> {title(order.paymentMethod || 'cash_on_delivery')} · {title(order.paymentStatus || 'unpaid')}{order.paymentReference ? ` · Ref ${order.paymentReference}` : ''}</p>{Number(order.refundAmount) > 0 && <p><strong>Refund:</strong> {money(order.refundAmount)} · {title(order.refundStatus || order.paymentStatus)}</p>}{order.paymentHistory?.length > 0 && <div className="admin-payment-history"><strong>Payment activity</strong>{order.paymentHistory.map((entry, index) => <small key={`${entry.createdAt}-${index}`}>{new Date(entry.createdAt).toLocaleString()} · {title(entry.status)} · {money(entry.amount)}{entry.reference ? ` · ${entry.reference}` : ''}</small>)}</div>}{order.statusHistory?.length > 0 && <div className="admin-payment-history"><strong>Order activity</strong>{order.statusHistory.map((entry, index) => <small key={`${entry.changedAt}-${index}`}>{new Date(entry.changedAt).toLocaleString()} · {title(entry.status)}</small>)}</div>}</div></details>
  </article>)}</div>;
}
