/*
# Premium pricing, webhook URL, and subscription webhook status

1. Modified Tables
- `app_settings`: add `premium_price` (numeric, default 0) and `premium_currency` (text, default 'NGN')
  and `payment_webhook_url` (text, nullable) to store the Google Apps Script webhook endpoint.
- `user_subscriptions`: add `webhook_status` (text, nullable) to record whether the payment
  notification webhook fired successfully ('sent') or failed ('failed'). NULL means not yet attempted.

2. Security
- No new tables. No policy changes needed — existing RLS on both tables continues to apply.
- The new columns on `app_settings` are only writable via the admin RPC (SECURITY DEFINER),
  so no additional grants are required.

3. Important Notes
- `premium_price` is the amount a listener pays for premium (stored as numeric to support
  any currency without floating-point loss).
- `premium_currency` is a 3-letter ISO code (NGN, USD, GBP, EUR, CAD).
- `payment_webhook_url` stores the deployed Google Apps Script /exec URL. When empty, receipt
  uploads still succeed but no email notification is sent.
- `webhook_status` on `user_subscriptions` lets the admin panel show delivery state per submission.
*/

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS premium_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS premium_currency text NOT NULL DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS payment_webhook_url text;

ALTER TABLE user_subscriptions
  ADD COLUMN IF NOT EXISTS webhook_status text;
