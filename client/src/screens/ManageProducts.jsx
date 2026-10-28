'use client';

import { useEffect, useState } from 'react';
import { Link, useNavigate } from '../lib/navigation';
import api from '../api/axios';
import { demoProducts } from './Home';

const initialForm = {
  name: '',
  description: '',
  price: '',
  imageUrl: '',
  category: '',
  stock: '0',
};

export default function ManageProducts() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('Everything');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [visibleCatalogCount, setVisibleCatalogCount] = useState(12);
  const [addingCatalogId, setAddingCatalogId] = useState('');
  const [catalogValues, setCatalogValues] = useState({});
  const [token, setToken] = useState('');

  const loadProducts = async (authToken = token) => {
    try {
      const response = await api.get('/products/my-products', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      setProducts(response.data.products || []);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }

      setError(err.response?.data?.message || 'Products load nahi ho sake.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const authToken = localStorage.getItem('token');
    if (!authToken) {
      navigate('/login');
      return;
    }
    setToken(authToken);
    loadProducts(authToken);
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      const response = await api.post('/products', form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProducts((previous) => [response.data.product, ...previous]);
      setForm(initialForm);
      setMessage('Product successfully add ho gaya.');
    } catch (err) {
      setError(err.response?.data?.message || 'Product add nahi ho saka.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId) => {
    const confirmed = window.confirm(
      'Kya aap waqai is product ko delete karna chahte hain?'
    );

    if (!confirmed) return;

    setError('');
    setMessage('');

    try {
      await api.delete(`/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProducts((previous) =>
        previous.filter((product) => product._id !== productId)
      );

      setMessage('Product delete ho gaya.');
    } catch (err) {
      setError(err.response?.data?.message || 'Product delete nahi ho saka.');
    }
  };

  const handleAddCatalogProduct = async (catalogProduct) => {
    const values = catalogValues[catalogProduct._id] || { price: catalogProduct.price, stock: '' };
    if (values.stock === '' || Number(values.stock) < 1) { setError('Store mein add karne se pehle stock ki quantity set karein.'); return; }
    setError(''); setMessage(''); setAddingCatalogId(catalogProduct._id);
    try {
      const response = await api.post('/products', {
        name: catalogProduct.name,
        description: '',
        price: Number(values.price),
        imageUrl: catalogProduct.imageUrl,
        category: catalogProduct.category,
        stock: Number(values.stock),
      }, { headers: { Authorization: `Bearer ${token}` } });
      setProducts((previous) => [response.data.product, ...previous]);
      setMessage(`${catalogProduct.name} aapke store mein add ho gaya.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Product aapke store mein add nahi ho saka.');
    } finally { setAddingCatalogId(''); }
  };

  const availableCatalogProducts = demoProducts.filter((product) => {
    const categoryMatch = catalogCategory === 'Everything' || product.category === catalogCategory;
    const searchMatch = `${product.name} ${product.category}`.toLowerCase().includes(catalogSearch.toLowerCase());
    return categoryMatch && searchMatch && !products.some((existing) => existing.name.toLowerCase() === product.name.toLowerCase());
  });
  const visibleCatalogProducts = availableCatalogProducts.slice(0, visibleCatalogCount);

  return (
    <main className="products-page">
      <header className="manage-topbar">
        <Link className="brand" to="/">market<span>hub</span><i>®</i></Link>
        <nav aria-label="Seller navigation"><Link to="/dashboard">Dashboard ↗</Link><Link to="/orders">Orders ↗</Link></nav>
      </header>

      <div className="manage-content">
        <section className="manage-heading">
          <div><span className="eyebrow">YOUR SHOP · INVENTORY</span><h1>Manage your products.</h1><p>Add something lovely to your shelves, or keep an eye on what’s already there.</p></div>
          <Link className="button button-dark" to="/dashboard">Back to dashboard <span>↗</span></Link>
        </section>

        {message && <div className="manage-alert manage-alert-success" role="status">{message}</div>}
        {error && <div className="manage-alert manage-alert-error" role="alert">{error}</div>}

        <section className="manage-panel" aria-labelledby="catalog-title">
          <div className="manage-panel-heading">
            <div><span className="eyebrow">A LITTLE INSPIRATION</span><h2 id="catalog-title">Choose a product for your store</h2><p>Pick a product, set your price and stock, and add it to your own shop.</p></div>
            <label className="manage-search"><span aria-hidden="true">⌕</span><input aria-label="Search catalogue products" value={catalogSearch} onChange={(event) => { setCatalogSearch(event.target.value); setVisibleCatalogCount(12); }} placeholder="Find a product…" /></label>
          </div>

          <div className="manage-filters" aria-label="Filter products by category">{['Everything', 'Clothing', 'Accessories', 'Home & living', 'Beauty', 'Lifestyle'].map((item) => <button type="button" key={item} onClick={() => { setCatalogCategory(item); setVisibleCatalogCount(12); }} className={`filter-chip ${catalogCategory === item ? 'active' : ''}`}>{item}</button>)}</div>

          {availableCatalogProducts.length ? <>
            <div className="manage-product-grid">{visibleCatalogProducts.map((product) => {
              const values = catalogValues[product._id] || { price: product.price, stock: '' };
              return <article className="manage-product-card" key={product._id}>
                <div className="manage-product-image"><img src={product.imageUrl} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = demoProducts[0].imageUrl; }} alt={product.name} loading="lazy" /></div>
                <div className="manage-product-copy"><span className="eyebrow">{product.category}</span><h3>{product.name}</h3>
                  <div className="manage-product-fields">
                    <label>Your price <span>(Rs.)</span><input type="number" min="0" step="1" value={values.price} onChange={(event) => setCatalogValues((previous) => ({ ...previous, [product._id]: { ...values, price: event.target.value } }))} /></label>
                    <label>Stock<input type="number" min="1" step="1" value={values.stock} onChange={(event) => setCatalogValues((previous) => ({ ...previous, [product._id]: { ...values, stock: event.target.value } }))} placeholder="Set quantity" /></label>
                  </div>
                  <button type="button" disabled={addingCatalogId === product._id} onClick={() => handleAddCatalogProduct(product)} className="manage-add-button">{addingCatalogId === product._id ? 'Adding…' : 'Add to my store'} <span>＋</span></button>
                </div>
              </article>;
            })}</div>
            {visibleCatalogProducts.length < availableCatalogProducts.length && <div className="manage-load-more"><button type="button" onClick={() => setVisibleCatalogCount((count) => count + 12)}>Load more products <span>({availableCatalogProducts.length - visibleCatalogProducts.length} left)</span></button></div>}
          </> : <div className="manage-empty"><span>✳</span><p>All products in this category are already in your store.</p></div>}
        </section>

        <section className="manage-panel manage-create-panel" aria-labelledby="new-product-title">
          <div className="manage-panel-heading"><div><span className="eyebrow">MADE BY YOU?</span><h2 id="new-product-title">Add a new product</h2><p>Have something unique? Add it directly to your store.</p></div><span className="manage-panel-mark" aria-hidden="true">✳</span></div>
          <form onSubmit={handleSubmit} className="manage-create-form">
            <label>Product name<input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Hand-thrown ceramic vase" required maxLength={120} /></label>
            <label>Category<input name="category" value={form.category} onChange={handleChange} placeholder="e.g. Home & living" required /></label>
            <label>Price (Rs.)<input name="price" type="number" value={form.price} onChange={handleChange} placeholder="0" min="0" step="0.01" required /></label>
            <label>Available stock<input name="stock" type="number" value={form.stock} onChange={handleChange} placeholder="0" min="0" step="1" required /></label>
            <label className="manage-form-wide">Image URL <span>(optional)</span><input name="imageUrl" type="url" value={form.imageUrl} onChange={handleChange} placeholder="https://…" /></label>
            <label className="manage-form-wide">Description <span>(optional)</span><textarea name="description" value={form.description} onChange={handleChange} placeholder="Tell shoppers a little about it…" maxLength={2000} rows={4} /></label>
            <button type="submit" disabled={saving} className="button button-dark manage-submit">{saving ? 'Adding product…' : 'Add product to your store'} <span>↗</span></button>
          </form>
        </section>

        <section className="manage-inventory" aria-labelledby="inventory-title">
          <div className="manage-inventory-heading"><div><span className="eyebrow">ON YOUR SHELVES</span><h2 id="inventory-title">Your products <span>({products.length})</span></h2></div></div>
          {loading ? <div className="manage-empty">Loading your products…</div> : products.length === 0 ? <div className="manage-empty"><span>✳</span><p>Your store is ready for its first product.</p></div> : <div className="manage-inventory-grid">{products.map((product) => <article className="manage-inventory-card" key={product._id}>
            {product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = demoProducts[0].imageUrl; }} /> : <div className="manage-no-image">✳</div>}
            <div><span className="eyebrow">{product.category}</span><h3>{product.name}</h3><strong>Rs. {Number(product.price).toLocaleString('en-PK')}</strong><p>Stock: {product.stock}</p>{product.description && <p className="manage-description">{product.description}</p>}<button type="button" onClick={() => handleDelete(product._id)}>Delete product</button></div>
          </article>)}</div>}
        </section>
      </div>
    </main>
  );
}
