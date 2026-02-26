

## Why the event landing page stopped working

The `get-landing-page` edge function is being called via raw `fetch()` **without the required `apikey` header**. The edge function logs confirm this: they show only boot/shutdown cycles with zero request-processing logs, meaning the gateway is rejecting the requests before they ever reach your function code.

This likely worked before because the backend gateway was more lenient about enforcing the `apikey` header requirement. A recent infrastructure-level change now strictly requires it on all edge function calls, even public ones.

## Evidence

- `EventLandingPageView.tsx` line 48-55: `fetch()` call to `get-landing-page` has no `apikey` header
- Edge function logs: only `Boot` and `Shutdown` entries, no request processing whatsoever
- Same missing header on the `process-event-registration` and `validate-coupon` calls within this file

## Fix

### File: `src/pages/public/EventLandingPageView.tsx`

Three fetch calls need the `apikey` header added:

1. **`get-landing-page` fetch** (~line 52): Add `'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY` to headers
2. **`process-event-registration` fetch** (registration handler): Same header addition
3. **`validate-coupon` fetch inside iframe script** (in `getEnhancedHtml`): Inject the key as a JS variable and include it in the inline fetch headers

No other files need changes. No database migrations required.

