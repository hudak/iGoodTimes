/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Only configure Google OAuth2 where both credentials are actually set
  // (i.e. Railway). Local dev sets neither, so the provider stays disabled
  // and the sign-in form shows only the OTP option - the same graceful
  // degradation 1788600004_configure_smtp.js uses for RESEND_TOKEN.
  const clientId = $os.getenv("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = $os.getenv("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return;
  }

  const users = app.findCollectionByNameOrId("users");

  // Replace any existing "google" entry rather than appending a duplicate,
  // so the migration is idempotent if it is ever re-run.
  users.oauth2 = {
    ...users.oauth2,
    enabled: true,
    providers: [
      ...users.oauth2.providers.filter((p) => p.name !== "google"),
      { name: "google", clientId: clientId, clientSecret: clientSecret },
    ],
  };

  return app.save(users);
}, (app) => {
  // Revert to the pre-migration state: remove the Google provider and leave
  // OAuth2 enabled only if some other provider is still configured.
  const users = app.findCollectionByNameOrId("users");
  const providers = users.oauth2.providers.filter((p) => p.name !== "google");

  users.oauth2 = {
    ...users.oauth2,
    enabled: providers.length > 0,
    providers: providers,
  };

  return app.save(users);
})
