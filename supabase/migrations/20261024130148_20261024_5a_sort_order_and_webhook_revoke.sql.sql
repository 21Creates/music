/*
# Phase 5: Add sort_order to premium_features + revoke public_get_webhook_url

## Summary
1. P18: Adds `sort_order` integer column to `premium_features` so display ordering
   can be managed from the database instead of a hardcoded array in the frontend.
   Defaults to 0 for existing rows.

2. Tightens `public_get_webhook_url()`: revokes EXECUTE from authenticated.
   The webhook POST was moved server-side to the `send-subscription-webhook`
   edge function in Phase 4, so the client no longer needs to fetch the URL.
   Only service_role (used by the edge function) retains access.

## Changes
- ALTER TABLE premium_features ADD COLUMN sort_order integer DEFAULT 0
- REVOKE EXECUTE ON public_get_webhook_url() FROM authenticated
*/

ALTER TABLE premium_features ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

REVOKE EXECUTE ON FUNCTION public.public_get_webhook_url() FROM authenticated;
