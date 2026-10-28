
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
 stages: [
  { duration: '20s', target: 25 },
  { duration: '20s', target: 50 },
  { duration: '30s', target: 100 },
  { duration: '20s', target: 0 },
],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export function setup() {
  const response = http.post(
    'http://localhost:5000/api/auth/login',
    JSON.stringify({
      email: __ENV.TEST_EMAIL,
      password: __ENV.TEST_PASSWORD,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.status} ${response.body}`);
  }

  return { token: response.json('token') };
}

export default function (data) {
  const headers = {
    Authorization: `Bearer ${data.token}`,
  };

  const stores = http.get('http://localhost:5000/api/stores');
  check(stores, {
    'Stores API 200': (r) => r.status === 200,
  });

  const products = http.get('http://localhost:5000/api/products');
  check(products, {
    'Products API 200': (r) => r.status === 200,
  });

  const orders = http.get('http://localhost:5000/api/orders/mine', {
    headers,
  });
  check(orders, {
    'Orders API 200': (r) => r.status === 200,
  });

  sleep(1);
}

