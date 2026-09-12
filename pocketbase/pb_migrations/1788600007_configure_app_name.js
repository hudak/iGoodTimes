/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // The instance still uses PocketBase's default app name ("Acme"), which is
  // what shows up in auth emails (e.g. the OTP email). Set the real name.
  const settings = app.settings();
  settings.meta = {
    ...settings.meta,
    appName: "GoodTimes",
  };
  return app.save(settings);
}, (app) => {
  const settings = app.settings();
  settings.meta = {
    ...settings.meta,
    appName: "Acme",
  };
  return app.save(settings);
})
