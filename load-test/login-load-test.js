
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    login_burst: {
      executor: 'per-vu-iterations',
      vus: 100,
      iterations: 1,
      maxDuration: '2m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
   http_req_duration: ['p(95)<10000'],
  },
};

export default function () {
  const email = __ENV.TEST_EMAIL;
  const password = __ENV.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error('Set TEST_EMAIL and TEST_PASSWORD first');
  }

  const response = http.post(
    'http://localhost:5000/api/auth/login',
    JSON.stringify({ email, password }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

if (response.status !== 200) {
  console.log(`Status=${response.status} Body=${response.body}`);
}

  check(response, {
    'Login returns 200': (res) => res.status === 200,
    'Login returns token': (res) => {
      try {
        return Boolean(JSON.parse(res.body).token);
      } catch {
        return false;
      }
    },
  });
}
