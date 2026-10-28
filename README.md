# ecommerce
ecommerce wesbite using mern stack
# MarketHub admin panel

The e-commerce admin dashboard is at `/admin`. Sign in at `/admin/login` with an existing administrator account. Admin signup is disabled; public storefront signup only creates customer accounts. A trusted database operator can grant an existing account the `admin` role in MongoDB Compass. The server rechecks the user's current MongoDB role for every `/api/admin/*` request, so client-side state cannot grant access.

Use a strong private `JWT_SECRET` in the server environment. Never commit real secrets. Additional administrator accounts should be provisioned by a trusted database operator.

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in the server environment to enable admin image uploads. Uploads accept JPG, PNG, WebP, and AVIF images up to 5 MB. Cloudinary returns an optimized HTTPS URL that is saved in the existing `Product.imageUrl` field. If these settings are absent, product management remains available by pasting an HTTPS image URL and the upload endpoint reports that uploads are not configured.

Admin product creation selects an existing store and retains that store's owner in the existing product schema. Admin status changes update the shared order record, which is the same status returned to customer order history.

## Admin password recovery

`/admin/forgot-password` sends a code through the WhatsApp Business Cloud API. Keep real values in `server/.env` only; `server/.env.example` contains placeholders. Set `ADMIN_RECOVERY_WHATSAPP_NUMBER` in international format, `WA_ACCESS_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_ADMIN_OTP_TEMPLATE_NAME`, and `JWT_SECRET`. Use the Phone Number ID shown under the sender in Meta's WhatsApp API Setup, and a server-side token with access to that WhatsApp Business Account. The template must be an approved `AUTHENTICATION` template with a `COPY_CODE` OTP button. Meta supplies the message text; the API sends the OTP once as the body parameter and again for the copy-code button. When creating the template, set its expiry footer to match `ADMIN_OTP_TTL_SECONDS` (default 300 seconds = 5 minutes), and configure the exact approved template name and language. After changing backend values, restart the backend. Recovery codes expire, allow at most five verification attempts, and are consumed on successful verification. Without provider credentials and an approved template, WhatsApp recovery remains unavailable; the app does not reveal or log OTPs. Never put these credentials in `client/.env` or frontend code.

If WhatsApp is not configured and the administrator is locked out, a trusted operator with access to the server and MongoDB can run `npm run admin:reset-password` from `server/`. It prompts for the admin email and new password in a terminal, hashes the password, consumes any pending recovery credentials, and invalidates all existing sessions. It does not enable a web-based bypass or print a recovery code.

## Sales reports and payments

The admin dashboard separates active order value from captured revenue and pending collection, so unpaid Cash on Delivery orders do not appear as paid revenue. The Sales Reports section reads MongoDB orders, supports date, product, customer, and order/payment status filters, and charts daily, monthly, or yearly net sales. It calculates captured sales less recorded refunds, and exports filtered transaction details (including item prices and delivery dates) to CSV or the browser print dialog. Expand a transaction to review its financial breakdown. Product costs are not stored in the current schema, so profit is not estimated. Older records without discount, tax, shipping, refund, or payment-history fields are treated as zero or not recorded. Report day boundaries use UTC consistently.

The current checkout only creates unpaid Cash on Delivery orders and no payment gateway is connected. The Payments section shows those real order/payment records and any recorded payment history as read-only. It never marks an order paid or refunded without a verified provider integration. The order schema has provider, reference, payment-history, and refund fields ready for the provider integration; no fake transactions or successful payments are generated.
