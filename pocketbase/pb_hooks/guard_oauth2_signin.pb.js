/// <reference path="../pb_data/types.d.ts" />

// SECURITY-CRITICAL: "Account creation is admin-managed" must hold for the
// OAuth2 path too. PocketBase's native OAuth2 flow auto-creates a `users`
// record when no existing record matches the provider identity or verified
// email. This guard refuses that case outright: when `e.record` is null there
// is no pre-approved account, so sign-in is denied and nothing is created.
// See openspec/changes/refine-oauth-sign-in/design.md D1/D2.
//
// Fail closed by construction: throwing aborts the hook chain before the
// OAuth2 handler's create branch can run. Keep the throw a ForbiddenError
// (an ApiError) - recordAuthWithOAuth2 wraps any non-ApiError failure into a
// generic 400 "Failed to authenticate.", which the client could not tell
// apart from a network error. Do NOT make this handler `async`: the JSVM
// silently ignores thrown ApiErrors from async handlers
// (https://github.com/pocketbase/pocketbase/issues/6476).
onRecordAuthWithOAuth2Request((e) => {
  if (!e.record) {
    const email = e.oAuth2User ? e.oAuth2User.email : "(unknown)";
    console.log("[oauth2-guard] refused unapproved sign-in", email, new Date().toISOString());

    throw new ForbiddenError(
      "That address isn't on the list yet - contact Nich for help.",
    );
  }

  e.next();
}, "users");
