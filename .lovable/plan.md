

# Root Cause: `get-landing-page` Edge Function Not Deployed

The `ERR_QUIC_PROTOCOL_ERROR` is not caused by a missing `apikey` header. The real issue is that the **`get-landing-page` edge function does not exist on the server**. When I tested it directly, it returned:

```
404 NOT_FOUND: "Requested function was not found"
```

The function code exists in the codebase (`supabase/functions/get-landing-page/index.ts`) but has never been deployed (or was removed during a previous deployment cycle). Chrome reports `ERR_QUIC_PROTOCOL_ERROR` instead of a clean 404 because the gateway drops the connection at the transport level when the function endpoint doesn't exist.

## Fix

Deploy the `get-landing-page` edge function. This is a single action — no code changes needed since the function code and the `apikey` header fix are already in place.

### Technical Detail
- The `apikey` header addition from the previous fix is still correct and necessary
- The function just needs to be deployed to the backend
- Once deployed, the event landing pages at `/event/bharat-dtoc-2026` and `/event/advaita-women-entreprenuer-awards-2026-` should load correctly

