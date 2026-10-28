'use client';
import { useEffect, useState } from 'react';
import { Link } from '../lib/navigation';

export default function MarketHeader() {
  const [count, setCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { const sync = () => { setCount(Number(localStorage.getItem('markethub-cart') || 0)); setIsLoggedIn(Boolean(localStorage.getItem('token'))); try { setIsAdmin(JSON.parse(localStorage.getItem('user') || '{}').role === 'admin'); } catch { setIsAdmin(false); } }; sync(); window.addEventListener('market-cart-updated', sync); window.addEventListener('storage', sync); return () => { window.removeEventListener('market-cart-updated', sync); window.removeEventListener('storage', sync); }; }, []);
  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.assign('/'); };
  return <><div className="announcement">A little more you. A little less ordinary. <span>Thoughtful finds from independent shops</span></div><header className="site-header"><Link className="brand" to="/" aria-label="MarketHub home">market<span>hub</span><i>®</i></Link><nav className="main-nav" aria-label="Main navigation"><Link to="/discover">Discover</Link><Link to="/shops">Shops</Link><Link to="/#our-story">Our story</Link></nav><div className="header-actions"><Link className="header-login" to={isLoggedIn ? '/dashboard' : '/login'}>{isLoggedIn ? 'My account' : 'Log in'}</Link>{isLoggedIn && <><Link className="header-login" to="/orders">Orders</Link>{isAdmin && <Link className="header-login" to="/admin">Admin panel</Link>}<button type="button" className="logout-button" onClick={logout}>Log out</button></>}<Link className="bag-button" to="/cart">Bag <span>{count}</span></Link></div></header></>;
}
