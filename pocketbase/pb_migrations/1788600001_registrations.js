/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    name: "registrations",
    type: "base",
    fields: [
      { name: "beach_week_n", type: "number", required: true },
      {
        name: "registered_by",
        type: "relation",
        required: true,
        collectionId: "_pb_users_auth_",
        maxSelect: 1,
        cascadeDelete: true,
      },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_registrations_week_person ON registrations (beach_week_n, registered_by)",
    ],
    // Any signed-in person can read all registrations (so the sign-up UI can show who's already checked in).
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    // A person may only create/delete their own registration - it's a
    // check-in checkbox, so there's nothing to update in place.
    createRule: '@request.auth.id != "" && @request.body.registered_by = @request.auth.id',
    deleteRule: '@request.auth.id != "" && registered_by = @request.auth.id',
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("registrations");
  return app.delete(collection);
})
