


# MarketHub — k6 Load Testing Report

Date: 22 October 2026

## 1. API Health Test
- Status: PASS
- 100 VUs ramp test completed
- HTTP failures: 0%
- p95: 1.99 ms

## 2. Products API
- Status: PASS
- 50 VUs tested
- HTTP failures: 0%

## 3. Stores API
- Status: PASS
- 10 VUs tested
- HTTP failures: 0%
- p95: 11.39 ms

## 4. Marketplace APIs
- Status: PASS
- 100 VUs tested
- Approximately 12,600+ requests
- HTTP failures: 0%
- p95: approximately 7–8 ms

## 5. Login API
- Status: PASS
- 100 concurrent login attempts tested
- All 100 login checks passed
- p95: approximately 7.2–7.7 seconds

## 6. Buyer Orders API
- Status: PASS
- 10 VUs tested
- HTTP failures: 0%
- p95: 9.37 ms

## 7. Order Creation
- Status: PASS
- One order created successfully
- HTTP status: 201
- Order total: Rs. 3,200
- Product stock decreased from 1 to 0

## 8. Stock Protection
- Status: PASS
- Sold-out product order rejected
- HTTP status: 409
- Available stock: 0

## 9. Invalid Order Validation
- Status: PASS
- Invalid product ID: 400
- Zero quantity: 400
- Missing customer name: 400
- All 3 validation checks passed

## Notes
- Expected 400 and 409 responses may count toward
  k6's http_req_failed metric.
- Login response time should be monitored.
- Order creation writes to the database and changes stock.
- These tests do not prove production readiness.
- Payment gateway testing has not been performed.

