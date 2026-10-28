import Home from '../../src/screens/Home';
import Catalog from '../../src/screens/Catalog';
import Shops from '../../src/screens/Shops';
import Cart from '../../src/screens/Cart';
import Signup from '../../src/screens/Signup';
import Login from '../../src/screens/Login';
import CreateStore from '../../src/screens/CreateStore';
import Dashboard from '../../src/screens/Dashboard';
import ManageProducts from '../../src/screens/ManageProducts';
import Storefront from '../../src/screens/Storefront';
import ProductDetail from '../../src/screens/ProductDetail';
import Orders from '../../src/screens/Orders';
import { redirect } from 'next/navigation';
import Admin from '../../src/screens/Admin';
import AdminAuth from '../../src/screens/AdminAuth';
import ClinicAdmin from '../../src/screens/ClinicAdmin';
import ClinicAuth from '../../src/screens/ClinicAuth';

export default async function MarketplacePage({ params }) {
  const { segments = [] } = await params;
  const [first, second] = segments;
  if (first === 'admin' && second === 'signup') redirect('/admin/login');
  let Screen = Home;

  if (first === 'discover' || first === 'category') Screen = Catalog;
  else if (first === 'shops') Screen = Shops;
  else if (first === 'cart') Screen = Cart;
  else if (first === 'signup') Screen = Signup;
  else if (first === 'login') Screen = Login;
  else if (first === 'create-store') Screen = CreateStore;
  else if (first === 'dashboard') Screen = Dashboard;
  else if (first === 'products') Screen = ManageProducts;
  else if (first === 'store' && second) Screen = Storefront;
  else if (first === 'product' && second) Screen = ProductDetail;
  else if (first === 'orders') Screen = Orders;
  else if (first === 'seller' && second === 'orders') Screen = () => <Orders seller />;
  else if (first === 'admin' && second === 'forgot-password') Screen = AdminAuth;
  else if (first === 'admin' && second === 'login') Screen = AdminAuth;
  else if (first === 'admin') Screen = Admin;
  else if (first === 'market-admin') Screen = Admin;
  else if (first === 'clinic-admin' && ['login', 'forgot-password', 'reset-password'].includes(second)) Screen = ClinicAuth;
  else if (first === 'clinic-admin') Screen = ClinicAdmin;

  return <Screen />;
}
