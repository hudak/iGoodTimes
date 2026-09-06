/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Same registration-gate shape as room_assignments (see that migration's comment).
  const registrationGate =
    '@request.auth.id != "" && @collection.registrations.beach_week_n ?= beach_week_n && @collection.registrations.registered_by ?= @request.auth.id';

  const collection = new Collection({
    name: "notes",
    type: "base",
    fields: [
      { name: "beach_week_n", type: "number", required: true },
      { name: "date", type: "date", required: true },
      { name: "content", type: "text", required: false },
      {
        name: "created_by",
        type: "relation",
        required: false,
        collectionId: "_pb_users_auth_",
        maxSelect: 1,
        cascadeDelete: false,
      },
      {
        name: "updated_by",
        type: "relation",
        required: false,
        collectionId: "_pb_users_auth_",
        maxSelect: 1,
        cascadeDelete: false,
      },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_notes_week_date ON notes (beach_week_n, date)",
    ],
    listRule: registrationGate,
    viewRule: registrationGate,
    createRule: registrationGate,
    updateRule: registrationGate,
    deleteRule: registrationGate,
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("notes");
  return app.delete(collection);
})
