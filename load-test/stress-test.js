
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    traffic_levels: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '30s', target: 50 },
        { duration: '15s', target: 100 },
        { duration: '30s', target: 100 },
        { duration: '15s', target: 150 },
        { duration: '30s', target: 150 },
        { duration: '15s', target: 200 },
        { duration: '30s', target: 200 },
        { duration: '15s', target: 250 },
        { duration: '30s', target: 250 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const response = http.get('http://localhost:5000/api/products', {
    tags: { endpoint: 'products' },
  });

  check(response, {
    'Products API returns 200': (res) => res.status === 200,
  });

  sleep(0.2);
}
