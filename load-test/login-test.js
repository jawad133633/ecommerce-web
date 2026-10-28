
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '15s', target: 5 },
    { duration: '20s', target: 10 },
    { duration: '15s', target: 0 },
  ],

  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const url = 'http://localhost:5000/api/auth/login';

  const payload = JSON.stringify({
    email: __ENV.TEST_EMAIL,
    password: __ENV.TEST_PASSWORD,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(url, payload, params);
  
if (response.status !== 200) {
  console.log(
    `Status: ${response.status} | Response: ${response.body}`
  );
}
  check(response, {
    'login returns 200': (res) => res.status === 200,
    'login returns token': (res) => {
      try {
        return Boolean(JSON.parse(res.body).token);
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
