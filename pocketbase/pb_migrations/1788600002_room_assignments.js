/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // The registration-gate rule: the acting user must have a `registrations` row
  // for this exact beach_week_n. This is the PocketBase equivalent of the
  // Postgres RLS policy `EXISTS registration WHERE beach_week_n = X AND
  // registered_by = current_person`, expressed as a cross-collection
  // back-reference filter (see design.md - Decisions - Collections & API rules).
  const registrationGate =
    '@request.auth.id != "" && @collection.registrations.beach_week_n ?= beach_week_n && @collection.registrations.registered_by ?= @request.auth.id';

  const collection = new Collection({
    name: "room_assignments",
    type: "base",
    fields: [
      { name: "beach_week_n", type: "number", required: true },
      {
        name: "room_name",
        type: "select",
        required: true,
        maxSelect: 1,
        values: [
          "Downstairs Primary",
          '"Old People" Room',
          "Upstairs Primary",
          "Bunk Beds",
          "Upstairs Front Room",
          "Media Room",
        ],
      },
      {
        name: "person",
        type: "relation",
        required: false,
        collectionId: "_pb_users_auth_",
        maxSelect: 1,
        cascadeDelete: false,
      },
      { name: "label", type: "text", required: false },
      {
        name: "added_by",
        type: "relation",
        required: true,
        collectionId: "_pb_users_auth_",
        maxSelect: 1,
        cascadeDelete: false,
      },
    ],
    // Deliberately no unique index / no rule limiting occupants per room_name:
    // the room-assignment spec requires no capacity or lock enforcement.
    listRule: registrationGate,
    viewRule: registrationGate,
    createRule: registrationGate,
    updateRule: registrationGate,
    deleteRule: registrationGate,
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("room_assignments");
  return app.delete(collection);
})
