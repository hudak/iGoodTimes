/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  // PocketBase auth collections ship with `authAlert.enabled = true`, which
  // sends a "Login from a new location" security email the first few times an
  // account signs in from a new IP/user-agent origin (it remembers up to 5
  // origins). For a small family app whose point is signing in from whatever
  // device is nearest, that email is noise. The only sign-in email that should
  // ever go out is the one-time code itself, so disable the alert here; OTP
  // (`users.otp`) is deliberately left untouched. Password reset, verification,
  // and email-change emails are unreachable regardless (password auth is off and
  // nothing requests the others), so OTP is the sole remaining sign-in email.
  users.authAlert = {
    ...users.authAlert,
    enabled: false,
  };

  return app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");

  users.authAlert = {
    ...users.authAlert,
    enabled: true,
  };

  return app.save(users);
})