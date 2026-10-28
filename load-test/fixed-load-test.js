
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const response = http.get('http://localhost:5000/api/products');

  check(response, {
    'Products API returns 200': (res) => res.status === 200,
  });

  sleep(0.2);
}
