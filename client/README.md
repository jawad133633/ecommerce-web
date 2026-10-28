# MarketHub client

The marketplace UI uses Next.js App Router. API endpoints and data behavior stay
on the existing Express backend.

## Run locally

```bash
npm install
npm run dev
```

The UI reads `NEXT_PUBLIC_API_BASE_URL` for the API URL. The previous
`VITE_API_BASE_URL` value is also accepted during migration. If neither is set,
the client uses `/api`.

## Production build

```bash
npm run build
npm run preview
```
