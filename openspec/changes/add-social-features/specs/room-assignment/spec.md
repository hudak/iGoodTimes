## Purpose

Lets people who registered for a beach week coordinate room assignments for that week, with no capacity or ownership enforcement — coordination is by visibility, not by locking.

## ADDED Requirements

### Requirement: Rooms are chosen from the house's fixed room list
The system SHALL restrict room assignment to a fixed, known set of rooms: Downstairs Primary, "Old People" Room, Upstairs Primary, Bunk Beds, Upstairs Front Room, and Media Room. The system SHALL NOT allow assigning to an arbitrary, freely-typed room name.

#### Scenario: Room picker offers only the known rooms
- **WHEN** a registered person opens the room assignment view for their week
- **THEN** they can choose only among Downstairs Primary, "Old People" Room, Upstairs Primary, Bunk Beds, Upstairs Front Room, and Media Room

### Requirement: Assign an occupant to a room
The system SHALL let a person registered for a week assign either a known account holder or a free-text label as an occupant of one of the fixed rooms for that week.

#### Scenario: Assign a known account holder
- **WHEN** a registered person assigns another account holder to one of the fixed rooms for their week
- **THEN** an assignment record is created linking that account holder to that room for that week

#### Scenario: Assign a free-text occupant
- **WHEN** a registered person assigns a free-text label (someone with no account) to one of the fixed rooms for their week
- **THEN** an assignment record is created with that label for that room for that week

### Requirement: No capacity or lock enforcement
The system SHALL NOT block or reject a room assignment because the room name already has one or more occupants for that week.

#### Scenario: Add another occupant to an already-occupied room
- **WHEN** a room name already has one or more occupants assigned for a week
- **THEN** a registered person can still add another occupant to that same room name without being blocked

### Requirement: Existing occupants are visible before assigning
The system SHALL show a registered person who else is already assigned to each room name for a week before or while they make a new assignment.

#### Scenario: View current occupants while assigning
- **WHEN** a registered person is assigning a room for a week
- **THEN** they can see the current occupants of each room name for that week

### Requirement: Access requires registration for the week
The system SHALL only allow viewing or modifying a week's room assignments to people registered for that week.

#### Scenario: Unregistered person is denied access
- **WHEN** a person has no registration for week N
- **THEN** they cannot view or modify room assignments for week N
