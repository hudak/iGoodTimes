// The house's fixed set of rooms (specs/room-assignment/spec.md - "Rooms are
// chosen from the house's fixed room list"). Must match the `room_name`
// select field's values in pocketbase/pb_migrations/1788600002_room_assignments.js.
export const ROOM_NAMES = [
  'Downstairs Primary',
  '"Old People" Room',
  'Upstairs Primary',
  'Bunk Beds',
  'Upstairs Front Room',
  'Media Room',
] as const;

export type RoomName = (typeof ROOM_NAMES)[number];
