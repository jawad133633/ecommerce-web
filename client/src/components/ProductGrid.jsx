'use client';
import { Link } from '../lib/navigation';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-PK')}`;
export default function ProductGrid({ products }) {
  const add = (product) => {
    if (String(product._id).startsWith('p')) { window.alert('This is a preview item. Create a store and add a real product to try checkout.'); return; }
    const items = JSON.parse(localStorage.getItem('markethub-cart-items') || '[]');
    items.push({ productId: product._id, name: product.name, price: product.price, imageUrl: product.imageUrl, storeName: product.store?.name || 'Independent shop' });
    localStorage.setItem('markethub-cart-items', JSON.stringify(items)); localStorage.setItem('markethub-cart', String(items.length)); window.dispatchEvent(new Event('market-cart-updated'));
  };
  return products.length ? <div className="product-grid">{products.map((product) => { const soldOut = typeof product.stock === 'number' && product.stock <= 0; return <article className="product-card" key={product._id}><Link className="product-image" to={String(product._id).startsWith('p') ? '/shops' : `/product/${product._id}`}><img src={product.imageUrl} alt={product.name} loading="lazy" />{product.label && <span className="product-label">{product.label}</span>}{soldOut && <span className="product-label">Sold out</span>}</Link><div className="product-info"><div className="product-meta"><Link to={product.store?.slug ? `/store/${product.store.slug}` : '/shops'}>{product.store?.name || 'Independent shop'}</Link><span>✳ 4.9</span></div><h3>{product.name}</h3><div className="product-bottom"><strong>{money(product.price)}</strong><button disabled={soldOut} onClick={() => add(product)}>{soldOut ? 'Sold out' : <>Add to bag <span>+</span></>}</button></div></div></article>; })}</div> : <div className="empty-products"><span>✳</span><p>No finds in that corner yet.</p><Link className="button button-dark" to="/discover">See everything</Link></div>;
}
