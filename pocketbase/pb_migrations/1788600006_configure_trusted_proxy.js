/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Behind Railway's proxy, PocketBase's RealIP() falls back to the raw socket
  // IP when no trusted proxy headers are configured - that is a per-request
  // edge IP, not the client's, and it differs between the realtime SSE connect
  // and the follow-up POST. PocketBase then rejects the OAuth2 realtime
  // subscription with "Invalid realtime client." (apis/realtime.go), and the
  // OAuth2 redirect handler's identical IP check would fail too - so Google
  // sign-in cannot complete. Trust X-Real-IP: Railway's edge sets it to a
  // single, stable client IP. X-Forwarded-For was tried first but its right-most
  // entry varies per edge (intermittent 400s) and its left-most entry is
  // spoofable. See design.md D7.
  const settings = app.settings();
  settings.trustedProxy = {
    ...settings.trustedProxy,
    headers: ["X-Real-IP"],
    useLeftmostIP: false,
  };
  return app.save(settings);
}, (app) => {
  const settings = app.settings();
  settings.trustedProxy = {
    ...settings.trustedProxy,
    headers: [],
    useLeftmostIP: false,
  };
  return app.save(settings);
})
