
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
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`,
  };

  const base = {
    customerName: 'Load Test Buyer',
    phone: '03001234567',
    address: 'Test address - do not deliver',
  };

  // Test 1: Invalid product ID
  const invalidProduct = http.post(
    'http://localhost:5000/api/orders',
    JSON.stringify({
      ...base,
      items: [{ productId: 'invalid-id', quantity: 1 }],
    }),
    { headers }
  );

  check(invalidProduct, {
    'Invalid product ID returns 400': (r) => r.status === 400,
  });

  console.log(`Invalid product ID: ${invalidProduct.status}`);

  // Test 2: Quantity zero
  const zeroQuantity = http.post(
    'http://localhost:5000/api/orders',
    JSON.stringify({
      ...base,
      items: [{
        productId: '6ad5c39fbeb3f60c83081b58',
        quantity: 0,
      }],
    }),
    { headers }
  );

  check(zeroQuantity, {
    'Zero quantity returns 400': (r) => r.status === 400,
  });

  console.log(`Zero quantity: ${zeroQuantity.status}`);

  // Test 3: Missing customer name
  const missingName = http.post(
    'http://localhost:5000/api/orders',
    JSON.stringify({
      phone: base.phone,
      address: base.address,
      items: [{
        productId: '6ad5c39fbeb3f60c83081b58',
        quantity: 1,
      }],
    }),
    { headers }
  );

  check(missingName, {
    'Missing customer name returns 400': (r) => r.status === 400,
  });

  console.log(`Missing customer name: ${missingName.status}`);
}
