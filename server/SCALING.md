# MarketHub deployment notes for traffic bursts

The API now bounds list responses, indexes common MongoDB filters, reuses a
bounded Mongoose pool, and caches public marketplace GET responses at shared
CDNs for 15 seconds. `server/index.js` is the Vercel serverless entry point and
reuses the database connection in warm function instances.

## Production configuration

- Set `MONGO_URI` to a production MongoDB deployment sized for the expected
  connection count and workload.
- Set `MONGO_MAX_POOL_SIZE` based on the database connection limit and maximum
  number of application instances. The default is 20 connections per instance;
  total possible connections are approximately pool size multiplied by active
  instances.
- If the API sits behind a trusted reverse proxy, set `TRUST_PROXY` to the
  number of trusted proxy hops so per-IP authentication throttling sees the
  actual client IP. Do not enable this on a directly exposed server without a
  trusted proxy in front of it.
- Use a hosting plan that can scale function/instance concurrency and configure
  its limits. MongoDB pool settings alone cannot provide application capacity.

The authentication limiter is process-local. Deployments with multiple active
instances need a shared rate-limit store for globally consistent limits.
Capacity for 100 concurrent users should be confirmed with a production-like
load test against the selected hosting plan and database tier; this code change
does not by itself guarantee a specific capacity.
