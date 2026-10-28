'use client';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from '../lib/navigation';
import api from '../api/axios';

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const handleChange = (event) => setFormData({ ...formData, [event.target.name]: event.target.value });
  const handleSubmit = async (event) => {
    event.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try { const { data } = await api.post('/auth/signup', formData); setSuccess(data.message); setTimeout(() => navigate('/login', { state: { next: searchParams.get('next') || location.state?.next || '/' } }), 1100); }
    catch (err) { setError(err.response?.data?.message || 'Signup failed. Check your backend connection.'); }
    finally { setLoading(false); }
  };
  return <div className="account-page signup-page">
    <header className="account-header"><Link className="brand" to="/">market<span>hub</span><i>®</i></Link><Link className="account-back" to="/">← <span>Back to marketplace</span></Link></header>
    <main className="signup-layout">
      <section className="signup-panel">
        <div className="signup-card"><span className="account-eyebrow">A GOOD PLACE TO BEGIN</span><h1>Make yourself<br /><em>at home.</em></h1><p className="account-intro">Create your free account and find the little shops worth knowing.</p>
          {error && <div role="alert" className="form-alert">{error}</div>}{success && <div role="status" className="form-success">{success}</div>}
          <form onSubmit={handleSubmit} className="account-form">
            <label htmlFor="name">Your name<input id="name" name="name" value={formData.name} onChange={handleChange} autoComplete="name" placeholder="What should we call you?" required /></label>
            <label htmlFor="email">Email address<input id="email" name="email" type="email" value={formData.email} onChange={handleChange} autoComplete="email" placeholder="you@example.com" required /></label>
            <label htmlFor="password">Create a password<input id="password" name="password" type="password" value={formData.password} onChange={handleChange} autoComplete="new-password" minLength={6} placeholder="At least 6 characters" required /></label>
            <button type="submit" disabled={loading} className="account-submit">{loading ? 'Creating your account...' : <>Create your account <span aria-hidden="true">→</span></>}</button>
          </form>
          <p className="account-switch">Already part of the market? <Link to="/login" state={{ next: searchParams.get('next') || location.state?.next }}>Log in <span aria-hidden="true">↗</span></Link></p>
        </div>
      </section>
      <aside className="signup-art" aria-label="What you can do on MarketHub">
        <div className="signup-sun" aria-hidden="true" /><span className="signup-art-kicker">GOOD THINGS START SOMEWHERE</span>
        <div className="signup-art-content"><span className="signup-art-number">01 / 03</span><h2>Find your<br />kind of <em>good.</em></h2><p>Meet independent makers, explore thoughtful finds, and support the shops that make every day more interesting.</p>
          <div className="signup-perks"><div><span aria-hidden="true">↗</span><p><strong>Discover</strong><br />One-of-a-kind finds</p></div><div><span aria-hidden="true">✳</span><p><strong>Support</strong><br />Independent shops</p></div></div>
        </div>
        <div className="signup-art-footer"><span>YOUR PEOPLE ARE HERE</span><span aria-hidden="true">M / H</span></div>
      </aside>
    </main>
  </div>;
}
