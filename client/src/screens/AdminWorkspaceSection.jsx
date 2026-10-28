'use client';
import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
const title = (value) => String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function AdminWorkspaceSection({ section, token, user, onLogout }) {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [filters, setFilters] = useState({ from: '', to: '', search: '', paymentStatus: '', status: '', granularity: 'day' }); const [applied, setApplied] = useState({}); const [page, setPage] = useState(1);
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' }); const [saving, setSaving] = useState(false);
  const headers = { Authorization: `Bearer ${token}` };
  const load = useCallback(async () => {
    if (section === 'settings') { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const path = section === 'reports' ? '/admin/reports' : section === 'payments' ? '/admin/payments' : '/admin/customers';
      const params = section === 'customers' ? { page, limit: 25, search: applied.search || '' } : { page, limit: 25, ...applied };
      const response = await api.get(path, { headers, params }); setData(response.data);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.assign('/admin/login'); return; }
      setError(err.response?.data?.message || 'Could not load this section.');
    }
    finally { setLoading(false); }
  }, [section, page, applied, token]);
  useEffect(() => { load(); }, [load]);

  const exportCsv = async () => {
    setError('');
    try {
      const response = await api.get('/admin/reports/export.csv', { headers, params: applied, responseType: 'blob' });
      const url = URL.createObjectURL(response.data); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'markethub-sales-report.csv'; anchor.click(); URL.revokeObjectURL(url);
    } catch { setError('Sales report could not be exported.'); }
  };
  const changePassword = async (event) => {
    event.preventDefault(); setError(''); setNotice('');
    if (password.newPassword !== password.confirmPassword) { setError('New passwords do not match.'); return; }
    setSaving(true);
    try {
      const response = await api.post('/admin/security/change-password', { currentPassword: password.currentPassword, password: password.newPassword, confirmPassword: password.confirmPassword }, { headers });
      setNotice(response.data.message || 'Password changed. Sign in again.'); setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
      window.setTimeout(onLogout, 900);
    } catch (err) { setError(err.response?.data?.message || 'Password could not be changed.'); }
    finally { setSaving(false); }
  };

  if (section === 'settings') return <section className="admin-card admin-settings-card"><div className="admin-card-heading"><div><span className="admin-kicker">ADMIN PROFILE & SECURITY</span><h2>Account security</h2></div></div>
    <div className="admin-profile-summary"><strong>{user?.name || 'Administrator'}</strong><span>{user?.email || ''} · Store administrator</span></div>
    {error && <div role="alert" className="admin-alert error">{error}</div>}{notice && <div role="status" className="admin-alert success">{notice}</div>}
    <form className="admin-password-form" onSubmit={changePassword}><h3>Change your password</h3><p>Use your current password to confirm this change. Your other signed-in sessions will be signed out.</p>
      <label>Current password<input type="password" autoComplete="current-password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} required/></label>
      <label>New password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} required/><small>12–128 characters</small></label>
      <label>Confirm new password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password.confirmPassword} onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })} required/></label>
      <button className="admin-primary-button" disabled={saving}>{saving ? 'Saving…' : 'Change password'}</button>
    </form><p className="admin-settings-footnote">Forgot your password? <a href="/admin/forgot-password">Recover access with WhatsApp OTP</a>.</p>
  </section>;

  if (loading) return <div className="admin-loading"><span/>Loading {section}…</div>;
  return <>
    {error && <div role="alert" className="admin-alert error">{error}</div>}
    {section === 'customers' && <>
      <div className="admin-section-intro"><div><h2>Customer accounts.</h2><p>Registered customer contact details and join dates.</p></div><form className="admin-order-filters" onSubmit={(e) => { e.preventDefault(); setPage(1); setApplied({ search: filters.search.trim() }); }}><input aria-label="Search customers" placeholder="Name, email, phone…" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}/><button className="admin-secondary-button">Search</button></form></div>
      <section className="admin-card admin-workspace-table"><div className="admin-card-heading"><div><span className="admin-kicker">CUSTOMERS</span><h2>{data?.total || 0} registered accounts</h2></div></div>{data?.customers?.length ? data.customers.map((customer) => <div className="admin-customer-row" key={customer._id}><div><strong>{customer.name}</strong><span>{customer.email}</span></div><span>{customer.phone || 'No phone number'}</span><time>{new Date(customer.createdAt).toLocaleDateString()}</time></div>) : <div className="admin-empty">No customers match this search.</div>}</section>
      <Pager page={page} pages={data?.pages || 1} setPage={setPage}/>
    </>}
    {section === 'reports' && <>
      <div className="admin-section-intro"><div><h2>Store sales & orders.</h2><p>See what has been collected, what is still due, and which products customers order most.</p></div><div className="admin-report-actions"><button type="button" className="admin-secondary-button" onClick={() => window.print()}>Print</button><button type="button" className="admin-secondary-button" onClick={exportCsv}>Export CSV</button></div></div>
      <FilterForm filters={filters} setFilters={setFilters} applied={applied} apply={(next) => { setPage(1); setApplied(next); }} includeStatus includePayment includeProduct includeGranularity products={data?.products || []}/>
      <div className="admin-metrics admin-report-summary">{[
        ['Net sales', money(data?.summary?.netSales), 'Collected payments, less discounts and refunds'],
        ['Gross sales', money(data?.summary?.grossSales), 'Captured item sales before discounts'],
        ['Refunds', money(data?.summary?.refunds), 'Recorded payment refunds'],
        ['Orders', data?.summary?.totalOrders || 0, `${data?.summary?.completedOrders || 0} delivered · ${data?.summary?.cancelledOrders || 0} cancelled`],
        ['Average order value', money(data?.summary?.averageOrderValue), 'Excludes cancelled orders'],
        ['Awaiting collection', money(data?.summary?.pendingCollection), 'Unpaid or pending, excluding cancelled'],
      ].map(([label, value, hint]) => <article className="admin-metric" key={label}><div><span>{label}</span></div><strong>{value}</strong><small>{hint}</small></article>)}</div>
      {Number(data?.summary?.pendingCollection) > 0 && Number(data?.summary?.netSales) === 0 && <div className="admin-report-note" role="status"><strong>No payments have been collected in this selection.</strong><span>Cash-on-delivery orders, including delivered orders, remain under Awaiting collection until their payment status is recorded as paid.</span></div>}
      <div className="admin-report-grid"><section className="admin-card admin-report-chart"><div className="admin-card-heading"><div><span className="admin-kicker">COLLECTED REVENUE</span><h2>Net sales by {data?.granularity || 'day'}</h2></div></div><ReportChart data={data?.trend || []} granularity={data?.granularity || 'day'}/><div className="admin-period-cards">{[['Today', data?.periods?.today], ['Last 7 days', data?.periods?.last7Days], ['This month', data?.periods?.monthToDate], ['This year', data?.periods?.yearToDate]].map(([name, period]) => <div key={name}><span>{name}</span><strong>{money(period?.netSales)}</strong><small>{period?.orders || 0} orders</small></div>)}</div></section>
      <section className="admin-card"><div className="admin-card-heading"><div><span className="admin-kicker">PRODUCT DEMAND</span><h2>Most ordered products</h2><p>Non-cancelled order quantities; unpaid COD orders are included.</p></div></div><div className="admin-best-sellers">{data?.bestSellers?.length ? data.bestSellers.map((product) => <div key={product._id}><strong>{product.name}</strong><span>{product.units} units · {money(product.orderValue)}</span></div>) : <div className="admin-empty">No products in the selected orders.</div>}</div></section></div>
      <section className="admin-card admin-workspace-table"><div className="admin-card-heading"><div><span className="admin-kicker">ORDER ACTIVITY</span><h2>Orders in this report · {data?.total || 0}</h2></div></div>{data?.orders?.length ? data.orders.map((order) => <details className="admin-transaction-details" key={order._id}><summary className="admin-transaction-row"><span><strong>#{String(order._id).slice(-7).toUpperCase()}</strong><span>{order.customerName} · {new Date(order.createdAt).toLocaleDateString()}</span></span><span>{order.items?.map((item) => `${item.name} × ${item.quantity}`).join(', ')}</span><span><i className={`report-status status-${order.paymentStatus}`}>{title(order.paymentStatus)}</i><i className={`report-status status-${order.status}`}>{title(order.status)}</i></span><strong>{money(order.total)}</strong></summary><div className="admin-transaction-breakdown"><div><strong>Customer</strong><span>{order.customerName} · {order.buyer?.email || 'No email'} · {order.phone}</span></div><div><strong>Products</strong><span>{order.items?.map((item) => `${item.name}: ${item.quantity} × ${money(item.unitPrice)}`).join(' · ')}</span></div><div><strong>Subtotal</strong><span>{money(order.subtotal ?? order.items?.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))}</span></div><div><strong>Discount</strong><span>{money(order.discountAmount)}</span></div><div><strong>Shipping & tax</strong><span>{money(order.shippingAmount)} · {money(order.taxAmount)}</span></div><div><strong>Payment</strong><span>{title(order.paymentMethod)} · {title(order.paymentStatus)}{order.paymentReference ? ` · ${order.paymentReference}` : ''}</span></div><div><strong>Refund</strong><span>{money(order.refundAmount || (order.paymentStatus === 'refunded' ? order.total : 0))} · {title(order.refundStatus || order.paymentStatus)}</span></div><div><strong>Delivered</strong><span>{order.statusHistory?.filter((entry) => entry.status === 'delivered').at(-1)?.changedAt ? new Date(order.statusHistory.filter((entry) => entry.status === 'delivered').at(-1).changedAt).toLocaleString() : 'Not delivered'}</span></div><p>Product cost is not stored, so this report shows order value rather than profit.</p></div></details>) : <div className="admin-empty">No orders match these filters. Try widening the date range or clearing a filter.</div>}</section>
      <Pager page={page} pages={data?.pages || 1} setPage={setPage}/>
    </>}
    {section === 'payments' && <>
      <div className="admin-section-intro"><div><h2>Payment records.</h2><p>Review recorded payment status, method, amount, and refund history.</p></div><span className="admin-period">{data?.gatewayConfigured ? 'Payment gateway connected' : 'No online gateway configured'}</span></div>
      <FilterForm filters={filters} setFilters={setFilters} applied={applied} apply={(next) => { setPage(1); setApplied(next); }} includePayment/>
      <section className="admin-card admin-workspace-table"><div className="admin-card-heading"><div><span className="admin-kicker">PAYMENTS</span><h2>{data?.total || 0} payment records</h2></div></div>{data?.orders?.length ? data.orders.map((order) => <div className="admin-payment-row" key={order._id}><div><strong>#{String(order._id).slice(-7).toUpperCase()}</strong><span>{order.customerName} · {new Date(order.createdAt).toLocaleDateString()}</span></div><div><strong>{title(order.paymentMethod)}</strong><span>{order.paymentReference || 'No transaction reference'}</span></div><strong>{money(order.total)}</strong><span className={`admin-payment-status payment-${order.paymentStatus}`}>{title(order.paymentStatus)}</span><div><strong>Refund</strong><span>{money(order.refundAmount)} · {title(order.refundStatus)}</span></div></div>) : <div className="admin-empty">No payment records match this filter.</div>}</section>
      <Pager page={page} pages={data?.pages || 1} setPage={setPage}/>
    </>}
  </>;
}

function FilterForm({ filters, setFilters, apply, includePayment, includeStatus, includeProduct, includeGranularity, products = [] }) {
  return <form className="admin-report-filters" onSubmit={(event) => { event.preventDefault(); apply({ from: filters.from, to: filters.to, search: filters.search.trim(), ...(includeGranularity ? { granularity: filters.granularity } : {}), ...(includePayment && filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}), ...(includeStatus && filters.status ? { status: filters.status } : {}), ...(includeProduct && filters.product ? { product: filters.product } : {}) }); }}>
    <label>From<input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })}/></label><label>To<input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })}/></label><label>Search customer / order<input placeholder="Customer, phone, ID" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}/></label>
    {includeProduct && <label>Product<select value={filters.product || ''} onChange={(e) => setFilters({ ...filters, product: e.target.value })}><option value="">All products</option>{products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}</select></label>}
    {includePayment && <label>Payment status<select value={filters.paymentStatus} onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}><option value="">All statuses</option>{['unpaid', 'pending', 'paid', 'failed', 'refunded'].map((item) => <option key={item} value={item}>{title(item)}</option>)}</select></label>}
    {includeStatus && <label>Order status<select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option>{['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'].map((item) => <option key={item} value={item}>{title(item)}</option>)}</select></label>}
    {includeGranularity && <label>Trend interval<select value={filters.granularity} onChange={(e) => setFilters({ ...filters, granularity: e.target.value })}><option value="day">Daily</option><option value="month">Monthly</option><option value="year">Yearly</option></select></label>}
    <button className="admin-primary-button">Apply filters</button>
  </form>;
}
function Pager({ page, pages, setPage }) { return <div className="admin-pager"><button type="button" className="admin-secondary-button" disabled={page <= 1} onClick={() => setPage((old) => old - 1)}>Previous</button><span>Page {page} of {pages}</span><button type="button" className="admin-secondary-button" disabled={page >= pages} onClick={() => setPage((old) => old + 1)}>Next</button></div>; }
function ReportChart({ data, granularity }) {
  if (!data.length) return <div className="admin-empty">No sales activity for this date range.</div>;
  if (!data.some((row) => Number(row.netSales) > 0)) return <div className="admin-report-chart-empty" role="status"><strong>Rs. 0 collected</strong><span>No paid sales in this selection yet.</span><small>Orders appear as sales after their payment is recorded.</small></div>;
  const max = Math.max(1, ...data.map((row) => row.netSales || 0));
  return <div className="admin-report-bars" role="img" aria-label={`Net sales by ${granularity}`}>{data.map((row) => <div key={row._id} title={`${row._id}: ${money(row.netSales)}`}><i style={{ height: `${Math.max(2, (row.netSales || 0) / max * 100)}%` }}/><small>{granularity === 'year' ? row._id : granularity === 'month' ? row._id : row._id.slice(5)}</small></div>)}</div>;
}
