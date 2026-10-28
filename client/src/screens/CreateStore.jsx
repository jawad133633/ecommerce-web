'use client';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from '../lib/navigation';
import api from '../api/axios';

export default function CreateStore() {
  const navigate = useNavigate(); const [formData, setFormData] = useState({ name: '', description: '', logoUrl: '' }); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const [hasToken, setHasToken] = useState(false);
  useEffect(() => { const token = localStorage.getItem('token'); setHasToken(Boolean(token)); if (!token) navigate('/signup?next=/create-store', { replace: true }); }, [navigate]);
  const handleChange = (event) => setFormData({ ...formData, [event.target.name]: event.target.value });
  const handleSubmit = async (event) => {
    event.preventDefault(); setError(''); const token = localStorage.getItem('token'); if (!token) { navigate('/login'); return; }
    setLoading(true); try { await api.post('/stores', formData, { headers: { Authorization: `Bearer ${token}` } }); navigate('/dashboard'); }
    catch (err) {
      if (!err.response) setError('MarketHub backend se connection nahi ho saka. Server chalaein aur server/.env mein MONGO_URI database connection check karein.');
      else if (err.response.status >= 500) setError('Store save nahi ho saka. Database connection aur backend logs check karke dobara try karein.');
      else setError(err.response.data?.message || 'Unable to create your store. Please try again.');
    }
    finally { setLoading(false); }
  };
  if (!hasToken) return <div className="loading-page">Taking you to account setup…</div>;
  return <div className="create-page"><header className="auth-topbar"><Link className="brand" to="/">market<span>hub</span><i>®</i></Link><Link className="auth-back" to="/dashboard">← Seller space</Link></header><main className="create-layout"><div className="create-intro"><span className="eyebrow">A LITTLE CORNER TO CALL YOUR OWN</span><h1>Let's make room for your good idea.</h1><p>Give your shop a name and a little introduction. You can always add your products and share your store after this.</p><span className="tiny-stars">✳ ✳ ✳</span></div><form className="create-form" onSubmit={handleSubmit}>{error && <div role="alert" className="form-alert">{error}</div>}<label htmlFor="store-name">What should we call your shop?<input id="store-name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Sunday Studio" maxLength={80} required /></label><label htmlFor="store-description">Tell us a little about it<textarea id="store-description" name="description" value={formData.description} onChange={handleChange} placeholder="What do you make, find, or love?" maxLength={500} rows={4} /></label><label htmlFor="store-logo">Shop image URL <span className="auth-back">(optional)</span><input id="store-logo" name="logoUrl" type="url" value={formData.logoUrl} onChange={handleChange} placeholder="https://…" /></label><button className="create-submit" type="submit" disabled={loading}>{loading ? 'Opening your shop…' : 'Open my shop ↗'}</button></form></main></div>;
}
