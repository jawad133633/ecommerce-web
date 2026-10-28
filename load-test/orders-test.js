
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '15s', target: 10 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export function setup() {
  const payload = JSON.stringify({
    email: __ENV.TEST_EMAIL,
    password: __ENV.TEST_PASSWORD,
  });

  const response = http.post(
    'http://localhost:5000/api/auth/login',
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(response, {
    'Login successful': (res) => res.status === 200,
  });

  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.status} ${response.body}`);
  }

  return { token: response.json('token') };
}

export default function (data) {
  const response = http.get('http://localhost:5000/api/orders/mine', {
    headers: {
      Authorization: `Bearer ${data.token}`,
    },
  });

  check(response, {
    'Orders API status is 200': (res) => res.status === 200,
  });

  sleep(1);
}
