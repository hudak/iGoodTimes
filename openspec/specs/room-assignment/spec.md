# Room Assignment Specification

## Purpose

Lets people who registered for a beach week coordinate room assignments for that week, with no capacity or ownership enforcement — each room is a single shared, freely-editable note for the week, not a set of individually owned records.

## Requirements

### Requirement: Rooms are chosen from the house's fixed room list
The system SHALL restrict room assignment to a fixed, known set of rooms: Downstairs Primary, "Old People" Room, Upstairs Primary, Bunk Beds, Upstairs Front Room, and Media Room. The system SHALL NOT allow assigning to an arbitrary, freely-typed room name.

#### Scenario: Room list offers only the known rooms
- **WHEN** a registered person opens the room assignment view for their week
- **THEN** they see exactly Downstairs Primary, "Old People" Room, Upstairs Primary, Bunk Beds, Upstairs Front Room, and Media Room, and no others

### Requirement: Each room has one shared, freely-editable text for the week
The system SHALL give each of the fixed rooms a single shared free-text field per week, rather than a list of separate occupant records. Any person registered for that week SHALL be able to create, edit, or clear that text — there is no per-entry ownership.

#### Scenario: Fill in a room for the first time
- **WHEN** a registered person adds text to a room that has no content yet for their week
- **THEN** that text becomes the room's shared content for that week, visible to everyone registered for the week

#### Scenario: Edit or clear an existing room's text
- **WHEN** a registered person edits or clears the existing shared text for a room, regardless of who wrote it last
- **THEN** the change is saved as the room's new shared content for that week

### Requirement: No capacity or lock enforcement
The system SHALL NOT restrict what a room's shared text may contain or require it to name a fixed number of occupants — any registered person can list as many or as few names as they want, or leave it empty.

#### Scenario: Listing multiple occupants in one room
- **WHEN** a registered person's edit to a room's shared text lists more than one occupant
- **THEN** the edit is saved without any capacity check

### Requirement: Access requires registration for the week
The system SHALL only allow viewing or modifying a week's room assignments to people registered for that week.

#### Scenario: Unregistered person is denied access
- **WHEN** a person has no registration for week N
- **THEN** they cannot view or modify room assignments for week N
