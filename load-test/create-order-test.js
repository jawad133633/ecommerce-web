
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<10000'],
  },
};

export function setup() {
  const response = http.post(
    'http://localhost:5000/api/auth/login',
    JSON.stringify({
      email: __ENV.TEST_EMAIL,
      password: __ENV.TEST_PASSWORD,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.status} ${response.body}`);
  }

  const token = response.json('token');

  if (!token) {
    throw new Error('Login response did not contain a token');
  }

  return { token };
}

export default function (data) {
  const response = http.post(
    'http://localhost:5000/api/orders',
    JSON.stringify({
      items: [
        {
          productId: '6ad5c39fbeb3f60c83081b58',
          quantity: 1,
        },
      ],
      customerName: 'Load Test Buyer',
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
    'Order created with status 201': (res) => res.status === 201,
    'Order response is successful': (res) => res.json('success') === true,
  });

  if (response.status !== 201) {
    console.log(`Order failed: ${response.status} ${response.body}`);
  } else {
    console.log(`Test order created: ${response.body}`);
  }
}


