'use client';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from '../lib/navigation';
import api from '../api/axios';

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-PK')}`;

export default function ProductDetail() {
  const { id } = useParams(); const navigate = useNavigate();
  const [product, setProduct] = useState(null); const [related, setRelated] = useState([]);
  const [quantity, setQuantity] = useState(1); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  useEffect(() => { api.get(`/products/${id}`).then(({ data }) => { setProduct(data.product); setRelated(data.related || []); }).catch((err) => setError(err.response?.data?.message || 'Product could not be found.')); }, [id]);
  const addToBag = () => {
    const bag = JSON.parse(localStorage.getItem('markethub-cart-items') || '[]');
    const additions = Array.from({ length: quantity }, () => ({ productId: product._id, name: product.name, price: product.price, imageUrl: product.imageUrl, storeName: product.store?.name || 'Independent shop' }));
    const next = [...bag, ...additions]; localStorage.setItem('markethub-cart-items', JSON.stringify(next)); localStorage.setItem('markethub-cart', String(next.length)); window.dispatchEvent(new Event('market-cart-updated'));
    setMessage(`${quantity} item${quantity > 1 ? 's' : ''} added to your bag.`);
  };
  if (error) return <main className="detail-page"><Link className="brand" to="/">market<span>hub</span><i>®</i></Link><section className="detail-error"><h1>Couldn’t find that product</h1><p>{error}</p><Link className="button button-dark" to="/">Back to marketplace ↗</Link></section></main>;
  if (!product) return <div className="loading-page">Finding this good thing…</div>;
  return <main className="detail-page"><header className="detail-top"><Link className="brand" to="/">market<span>hub</span><i>®</i></Link><div><Link to="/">Marketplace</Link><button onClick={() => navigate(-1)}>Go back</button></div></header><div className="detail-breadcrumb"><Link to="/">Home</Link><span> / </span>{product.category}<span> / </span>{product.name}</div><section className="detail-layout"><div className="detail-photo"><img src={product.imageUrl} alt={product.name} /></div><div className="detail-copy"><span className="eyebrow">{product.category?.toUpperCase()}</span><h1>{product.name}</h1><Link className="detail-store" to={`/store/${product.store?.slug}`}>Sold by {product.store?.name || 'Independent shop'} ↗</Link><div className="detail-price">{money(product.price)}</div><p className="detail-description">{product.description || 'Thoughtfully selected by an independent shop on MarketHub. A little something made to be enjoyed every day.'}</p><p className={product.stock > 0 ? 'stock-ok' : 'stock-none'}>{product.stock > 0 ? `${product.stock} available` : 'Out of stock'}</p><div className="detail-buy"><label>Quantity<select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>{Array.from({ length: Math.min(10, product.stock) }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label><button className="button button-dark" disabled={!product.stock} onClick={addToBag}>Add to bag <span>＋</span></button></div>{message && <p className="detail-confirm" role="status">{message} <Link to="/">Keep browsing</Link></p>}<div className="detail-promise"><span>✳</span><p><strong>Shop independent</strong><br />Every purchase supports the maker behind this little shop.</p></div></div></section>{related.length > 0 && <section className="detail-related"><span className="eyebrow">FROM THIS SHOP</span><h2>More from {product.store?.name}</h2><div className="product-grid">{related.map((item) => <Link className="product-card" key={item._id} to={`/product/${item._id}`}><span className="product-image"><img src={item.imageUrl} alt={item.name} /></span><div className="product-info"><h3>{item.name}</h3><strong>{money(item.price)}</strong></div></Link>)}</div></section>}</main>;
}
