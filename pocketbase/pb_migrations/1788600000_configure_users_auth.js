/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  // PocketBase's default `users` collection ships with createRule: "" (open
  // self-registration). identity spec requires accounts to be admin-managed
  // only, so lock creation to superusers (createRule: null).
  users.createRule = null;

  // Default listRule/viewRule ("id = @request.auth.id") only let a person
  // see their own record, which would break the room-assignment picker's
  // need to show other account holders. Small trusted family: any signed-in
  // person may read all `users` (mirrors the original plan's "read all
  // people" policy). No client-side update/delete rule is added, so people
  // still can't edit each other's records.
  users.listRule = '@request.auth.id != ""';
  users.viewRule = '@request.auth.id != ""';

  // Passwordless sign-in: enable one-time-code email login and disable
  // password auth outright, so there is no password-based path in at all
  // (an admin never sets a real password when creating an account).
  users.otp = {
    ...users.otp,
    enabled: true,
    duration: 180,
    length: 8,
  };
  users.passwordAuth = {
    ...users.passwordAuth,
    enabled: false,
  };

  return app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");

  users.createRule = "";
  users.listRule = "id = @request.auth.id";
  users.viewRule = "id = @request.auth.id";
  users.otp = { ...users.otp, enabled: false };
  users.passwordAuth = { ...users.passwordAuth, enabled: true };

  return app.save(users);
})
