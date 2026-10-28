'use client';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from '../lib/navigation';
import api from '../api/axios';
import { demoProducts } from './Home';
import MarketHeader from '../components/MarketHeader';
import ProductGrid from '../components/ProductGrid';

const categories = ['Everything', 'Clothing', 'Accessories', 'Home & living', 'Beauty', 'Lifestyle'];
export default function Catalog() {
  const { category: routeCategory } = useParams(); const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState(demoProducts); const [sort, setSort] = useState(params.get('sort') || 'newest');
  const [search, setSearch] = useState(params.get('q') || ''); const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/products').then(({ data }) => { if (data.products?.length) setProducts(data.products); }).catch(() => {}).finally(() => setLoading(false)); }, []);
  useEffect(() => { setSearch(params.get('q') || ''); setSort(params.get('sort') || 'newest'); }, [params]);
  const selected = routeCategory ? decodeURIComponent(routeCategory).replaceAll('-', ' ') : 'Everything';
  const visible = useMemo(() => products.filter((p) => (selected === 'Everything' || p.category?.toLowerCase() === selected.toLowerCase()) && `${p.name} ${p.category} ${p.store?.name}`.toLowerCase().includes(search.toLowerCase())).sort((a,b) => sort === 'price-low' ? a.price-b.price : sort === 'price-high' ? b.price-a.price : 0), [products, selected, search, sort]);
  const update = (key, value) => { const next = new URLSearchParams(params); value ? next.set(key, value) : next.delete(key); setParams(next); };
  return <div className="marketplace"><MarketHeader/><main className="catalog-page"><div className="detail-breadcrumb"><Link to="/">Home</Link><span> / </span>Discover</div><section className="catalog-intro"><span className="eyebrow">THE MARKET, RIGHT NOW</span><h1>Find your <em>good thing.</em></h1><p>Thoughtful pieces from independent makers, shops, and the people behind them.</p><label className="catalog-search"><span>⌕</span><input value={search} onChange={e => {setSearch(e.target.value); update('q',e.target.value)}} placeholder="Search products, categories, shops…" aria-label="Search marketplace"/></label></section><div className="catalog-layout"><aside className="catalog-sidebar"><span className="eyebrow">SHOP BY CATEGORY</span>{categories.map(c => <Link key={c} className={(selected.toLowerCase() === c.toLowerCase()) ? 'selected' : ''} to={c === 'Everything' ? '/discover' : `/category/${encodeURIComponent(c.toLowerCase().replaceAll(' ','-'))}`}>{c}<span>↗</span></Link>)}<div className="catalog-note"><span>✳</span><strong>Good things, made by good people.</strong><p>Every order supports an independent business.</p></div></aside><section className="catalog-results"><div className="catalog-toolbar"><span>{loading ? 'Finding good things…' : `${visible.length} ${visible.length === 1 ? 'find' : 'finds'}${selected !== 'Everything' ? ` in ${selected}` : ''}`}</span><label>Sort by <select value={sort} onChange={e => {setSort(e.target.value);update('sort',e.target.value === 'newest' ? '' : e.target.value)}}><option value="newest">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label></div><ProductGrid products={visible}/></section></div></main></div>;
}
