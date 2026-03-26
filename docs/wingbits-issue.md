# Wingbits Track API — Persistent 400 Errors

**Observed:** 2026-03-26 (~08:22–08:30 UTC)
**Log file:** `logs.1774513970582.errors.log`
**Service:** AIS Relay (`scripts/ais-relay.cjs`)

## Symptom

`[Wingbits Track] API error: 400` logged continuously — roughly every 1–3 seconds with occasional bursts of 10–15 concurrent 400s. No Wingbits flight data is returned to clients during this window. The relay falls back to returning `{ positions: [], source: 'wingbits' }` with HTTP 502 to the frontend.

Sample burst from 08:26:53 UTC (11 errors in under 1 second):
```
[Wingbits Track] API error: 400   ×11
```

## What the relay does

For every `/wingbits/track` request with bbox params, the relay:

1. Converts `lamin/lomin/lamax/lomax` to a Wingbits area object:
   ```js
   const centerLat = (lamin + lamax) / 2;
   const centerLon = (lomin + lomax) / 2;
   const widthNm  = Math.abs(lomax - lomin) * 60 * Math.cos(centerLat * Math.PI / 180);
   const heightNm = Math.abs(lamax - lamin) * 60;
   const areas = [{ alias: 'viewport', by: 'box', la: centerLat, lo: centerLon,
                    w: widthNm, h: heightNm, unit: 'nm' }];
   ```
2. POSTs to `https://customer-api.wingbits.com/v1/flights` with:
   - Header: `x-api-key: <WINGBITS_API_KEY>`
   - Body: `JSON.stringify(areas)`

The 400 response body is **never read or logged** — only `resp.status` is captured.

## Probable root causes (in priority order)

### 1. API contract change (most likely)

Wingbits changed their `/v1/flights` request schema. The `by: 'box'` area format or `unit: 'nm'` field may have been renamed or removed. Since every request fails, not just edge-case viewports, this is the strongest candidate.

**To verify:** Call the endpoint manually and read the 400 response body:
```bash
curl -s -X POST https://customer-api.wingbits.com/v1/flights \
  -H "x-api-key: $WINGBITS_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '[{"alias":"test","by":"box","la":48.8,"lo":2.3,"w":100,"h":100,"unit":"nm"}]'
```

### 2. API key expired or revoked

Wingbits may return 400 (not 401) for invalid keys depending on their implementation. Check the Wingbits dashboard to confirm the key is active.

### 3. Numeric overflow / zero dimensions

If `widthNm` or `heightNm` computes to 0 or `Infinity` (e.g., extreme zoom or polar coordinates), Wingbits may reject the request. This would cause intermittent rather than universal failures, so it is less likely given the logs.

## What is NOT logged (gap)

The current code only logs `resp.status`. The 400 response body — which would contain the actual error message from Wingbits — is discarded:
```js
if (!resp.ok) {
  console.warn(`[Wingbits Track] API error: ${resp.status}`);
  return safeEnd(res, 502, ...);
}
```

**Fix needed:** Log the response body on error to capture the Wingbits error message:
```js
if (!resp.ok) {
  const body = await resp.text().catch(() => '');
  console.warn(`[Wingbits Track] API error: ${resp.status} — ${body.slice(0, 300)}`);
  ...
}
```

## Impact

- All Wingbits live flight position data is unavailable
- Theater posture and military flight tracking panels that depend on Wingbits show no positions
- The relay returns `positions: []` so the UI shows an empty map, not an error state
- Callsign-only lookups still work if the in-memory `wingbitsIndex` was populated before the failures started

## Resolution checklist

- [ ] Read the 400 response body (curl test above or add logging)
- [ ] Check Wingbits dashboard: is `WINGBITS_API_KEY` still valid?
- [ ] Check Wingbits API changelog / release notes for schema changes to `/v1/flights`
- [ ] Add response body logging to `[Wingbits Track]` error path in `ais-relay.cjs`
- [ ] Once root cause confirmed, update the area payload format or rotate the key
- [ ] Re-deploy relay on Railway and verify errors stop
