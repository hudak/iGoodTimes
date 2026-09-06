/// <reference path="../pb_data/types.d.ts" />

// room_assignments must have exactly one of `person` (a known account holder)
// or `label` (a free-text occupant) set — never both, never neither.
// PocketBase field rules can't express "exactly one of two fields"
// declaratively, so it's enforced here instead (see design.md - Decisions).
function validateExactlyOnePersonOrLabel(e) {
  const person = e.record.get("person");
  const label = e.record.get("label");
  const hasPerson = !!person;
  const hasLabel = !!label;

  if (hasPerson === hasLabel) {
    throw new BadRequestError("Exactly one of `person` or `label` must be set.");
  }

  e.next();
}

onRecordCreateRequest(validateExactlyOnePersonOrLabel, "room_assignments");
onRecordUpdateRequest(validateExactlyOnePersonOrLabel, "room_assignments");
