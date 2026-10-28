
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
 
stages: [
  { duration: '10s', target: 5 },
  { duration: '10s', target: 10 },
  { duration: '10s', target: 0 },
],

  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const uniqueId = `${__VU}_${__ITER}_${Date.now()}`;

  const payload = JSON.stringify({
    name: `Load Test User ${uniqueId}`,
    email: `loadtest_${uniqueId}@example.com`,
    password: 'TestPass123!',
  });

  const response = http.post(
    'http://localhost:5000/api/auth/signup',
    payload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(response, {
    'Signup successful': (res) => res.status === 201,
  });

  if (response.status !== 201) {
  console.log(
    `VU=${__VU} Status=${response.status} Body=${response.body}`
  );
}


  sleep(1);
}
