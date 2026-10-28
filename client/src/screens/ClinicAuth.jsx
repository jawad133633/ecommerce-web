'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Link, useNavigate, useSearchParams } from '../lib/navigation';
import api from '../api/axios';

export default function ClinicAuth() {
  const path = usePathname(); const navigate = useNavigate(); const [params] = useSearchParams();
  const reset = path.endsWith('/reset-password'); const forgot = path.endsWith('/forgot-password');
  const [fields, setFields] = useState({ email: '', password: '', confirm: '', identifier: '' });
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [showPassword, setShowPassword] = useState(false);
  const change = (event) => setFields((old) => ({ ...old, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try {
      if (reset) {
        if (fields.password !== fields.confirm) throw new Error('Passwords do not match.');
        const { data } = await api.post('/auth/clinic/reset-password', { token: params.get('token'), password: fields.password });
        setMessage(data.message || 'Password changed. Sign in with your new password.');
      } else if (forgot) {
        const { data } = await api.post('/auth/clinic/forgot-password', { identifier: fields.identifier }); setMessage(data.message);
      } else {
        const { data } = await api.post('/auth/login', { email: fields.email, password: fields.password });
        if (!data.user || !['admin', 'doctor', 'receptionist', 'pharmacist'].includes(data.user.role)) throw new Error('This account is not clinic staff. Ask an administrator to create your staff account.');
        localStorage.setItem('token', data.token); localStorage.setItem('user', JSON.stringify(data.user)); navigate('/clinic-admin');
      }
    } catch (err) { setError(err.response?.data?.message || err.message || 'Request failed. Please try again.'); }
    finally { setBusy(false); }
  };
  return <main className="clinic-auth-page"><Link className="clinic-brand" to="/">markethub<span> clinic</span></Link><section className="clinic-auth-card"><div className="clinic-auth-mark" aria-hidden="true">+</div><span className="clinic-eyebrow">CLINIC + PHARMACY WORKSPACE</span><h1>{reset ? 'Choose a new password' : forgot ? 'Recover staff access' : 'Staff sign in'}</h1><p>{reset ? 'Set a strong password. This recovery link expires after 20 minutes.' : forgot ? 'Enter your registered email or WhatsApp number. We’ll send a secure recovery link if the account is eligible.' : 'Sign in with an administrator or authorized clinic staff account.'}</p>
    {error && <div className="clinic-alert clinic-error" role="alert">{error}</div>}{message && <div className="clinic-alert clinic-success" role="status">{message}</div>}
    <form onSubmit={submit} className="clinic-form">
      {!forgot && !reset && <label>Email address<input name="email" type="email" autoComplete="username" value={fields.email} onChange={change} required/></label>}
      {forgot && <label>Registered email or phone<input name="identifier" autoComplete="username" value={fields.identifier} onChange={change} required/></label>}
      {!forgot && <label>{reset ? 'New password' : 'Password'}<span className="clinic-password"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete={reset ? 'new-password' : 'current-password'} minLength={reset ? 12 : 1} value={fields.password} onChange={change} required/>{!reset && <button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button>}</span></label>}
      {reset && <label>Confirm new password<input name="confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={12} value={fields.confirm} onChange={change} required/></label>}
      <button className="clinic-primary" disabled={busy}>{busy ? 'Please wait…' : reset ? 'Change password' : forgot ? 'Send recovery link' : 'Sign in'}</button>
    </form>
    <div className="clinic-auth-links">{!reset && !forgot && <Link to="/clinic-admin/forgot-password">Forgot password?</Link>}{(reset || forgot) && <Link to="/clinic-admin/login">Back to staff sign in</Link>}{!reset && !forgot && <Link to="/login">Marketplace sign in</Link>}</div>
    <p className="clinic-auth-note">Staff accounts are created by an administrator. Public registration cannot grant clinic access.</p>
  </section></main>;
}
