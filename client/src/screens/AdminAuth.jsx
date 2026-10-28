'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Link, useNavigate, useSearchParams } from '../lib/navigation';
import api from '../api/axios';

export default function AdminAuth() {
  const pathname = usePathname();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState(pathname.endsWith('/forgot-password') ? 'forgot' : 'login');
  const [form, setForm] = useState({ email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setMode(pathname.endsWith('/forgot-password') ? 'forgot' : 'login');
    setError('');
    setMessage('');
  }, [pathname]);
  const change = (event) => setForm((old) => ({ ...old, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (mode === 'reset' && newPassword !== confirmPassword) return setError('Passwords do not match.');
    setBusy(true);
    try {
      if (mode === 'login') {
        const { data } = await api.post('/auth/admin/login', form);
        if (!data.token || data.user?.role !== 'admin') throw new Error('This account is not authorized for the admin panel.');
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate(params.get('next')?.startsWith('/admin') ? params.get('next') : '/admin', { replace: true });
      } else if (mode === 'forgot') {
        const { data } = await api.post('/auth/admin/forgot-password', { email: form.email });
        setMessage(data.message || 'If eligible, a recovery code has been sent to the configured WhatsApp number.');
        setMode('otp');
      } else if (mode === 'otp') {
        const { data } = await api.post('/auth/admin/verify-otp', { email: form.email, otp });
        setResetToken(data.resetToken);
        setMode('reset');
        setMessage(data.message || 'Code verified. Choose a new password.');
      } else {
        const { data } = await api.post('/auth/admin/reset-password', { email: form.email, resetToken, password: newPassword, confirmPassword });
        setMessage(data.message || 'Password changed. Sign in with your new password.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setMode('login');
        setResetToken('');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        navigate('/admin/login?passwordReset=success', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not sign in. Please try again.');
    } finally { setBusy(false); }
  };

  return <main className="admin-auth-page">
    <header className="admin-auth-header"><Link className="brand" to="/">market<span>hub</span><i>®</i></Link><Link to="/">Back to storefront <span aria-hidden="true">↗</span></Link></header>
    <section className="admin-auth-card" aria-labelledby="admin-auth-title">
      <span className="admin-auth-eyebrow">MARKETHUB · STORE ADMINISTRATION</span>
      <h1 id="admin-auth-title">{mode === 'login' ? 'Welcome back, admin.' : mode === 'forgot' ? 'Recover admin access.' : mode === 'otp' ? 'Enter your WhatsApp code.' : 'Choose a new password.'}</h1>
      <p>{mode === 'login' ? 'Sign in with your administrator account to manage the store.' : mode === 'forgot' ? 'Enter the administrator email. We will send a short-lived code to the configured recovery WhatsApp number.' : mode === 'otp' ? 'Enter the one-time code from WhatsApp. It expires soon and can only be used once.' : 'Use a new password with at least 12 characters. This will sign out existing sessions.'}</p>
      {error && <div role="alert" className="admin-auth-error">{error}</div>}
      {mode === 'login' && params.get('passwordReset') === 'success' && <div role="status" className="admin-auth-success">Administrator password changed. Sign in with your new password.</div>}
      {message && <div role="status" className="admin-auth-success">{message}</div>}
      <form onSubmit={submit} className="admin-auth-form">
        {mode !== 'otp' && mode !== 'reset' && <label htmlFor="admin-email">Administrator email<input id="admin-email" name="email" type="email" value={form.email} onChange={change} autoComplete="username" required /></label>}
        {mode === 'login' && <label htmlFor="admin-password">Password<input id="admin-password" name="password" type="password" value={form.password} onChange={change} autoComplete="current-password" required /></label>}
        {mode === 'otp' && <label htmlFor="admin-otp">WhatsApp verification code<input id="admin-otp" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 8))} minLength={6} maxLength={8} required /></label>}
        {mode === 'reset' && <>
          <label htmlFor="admin-new-password">New password<input id="admin-new-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
          <label htmlFor="admin-confirm-password">Confirm new password<input id="admin-confirm-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
        </>}
        <button type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in to admin panel' : mode === 'forgot' ? 'Send WhatsApp code' : mode === 'otp' ? 'Verify code' : 'Save new password'} <span aria-hidden="true">→</span></button>
      </form>
      <div className="admin-auth-switch">{mode === 'login' ? <><Link to="/admin/forgot-password">Forgot password?</Link><span> · </span>Need admin access? Ask an existing administrator.</> : <><Link to="/admin/login">Back to admin sign in</Link>{mode === 'otp' && <><span> · </span><button type="button" onClick={() => { setError(''); setMessage(''); setMode('forgot'); }}>Request another code</button></>}</>}</div>
      {mode === 'login' && <div className="admin-auth-security"><span aria-hidden="true">◆</span><p>Admin access is verified by the server on every request. A regular customer account cannot open store management.</p></div>}
    </section>
  </main>;
}
