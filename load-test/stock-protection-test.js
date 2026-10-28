
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
};

export function setup() {
  const login = http.post(
    'http://localhost:5000/api/auth/login',
    JSON.stringify({
      email: __ENV.TEST_EMAIL,
      password: __ENV.TEST_PASSWORD,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (login.status !== 200 || !login.json('token')) {
    throw new Error(`Login failed: ${login.status} ${login.body}`);
  }

  return { token: login.json('token') };
}

export default function (data) {
  const response = http.post(
    'http://localhost:5000/api/orders',
    JSON.stringify({
      items: [{
        productId: '6ad5c39fbeb3f60c83081b58',
        quantity: 1,
      }],
      customerName: 'Stock Test Buyer',
      phone: '03001234567',
      address: 'Test address - do not deliver',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.token}`,
      },
    }
  );

  check(response, {
    'Order rejected because stock is unavailable': (res) =>
      res.status === 409,
  });

  console.log(`Status: ${response.status}; Response: ${response.body}`);
}
