
# MarketHub — Stress Test Report

## Test Configuration
- Tool: k6
- Endpoint: GET /api/products
- Maximum Virtual Users: 250
- Test Duration: 4 minutes 30 seconds

## Results
- Total HTTP Requests: 163,095
- Failed HTTP Requests: 0 (0%)
- Successful Checks: 163,095 (100%)
- Average Response Time: 20.05 ms
- Median Response Time: 4.2 ms
- 90th Percentile: 49.68 ms
- 95th Percentile: 63.22 ms
- Maximum Response Time: 1.42 seconds
- Average Throughput: 603.67 requests/second

## Conclusion
The Products API passed the local k6 load test
with up to 250 virtual users and no failed HTTP requests.

Note: These results apply to the tested endpoint and
environment. They do not establish production capacity
for the entire marketplace.
