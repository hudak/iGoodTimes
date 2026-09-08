## Purpose

Lets an authenticated account holder check in for a beach week; that check-in is the sole gate for accessing that week's room assignments and notes.

## ADDED Requirements

### Requirement: Authenticated person can check in for a week
The system SHALL let an authenticated account holder register their own attendance for a beach week with a single toggle (check in / check out) — no additional required input.

#### Scenario: Check in
- **WHEN** an authenticated person marks themselves as attending a beach week
- **THEN** a registration record is created linking that person to that week

### Requirement: Checking out removes the registration immediately
The system SHALL remove a person's registration for a week as soon as they check out, with no confirmation step.

#### Scenario: Check out
- **WHEN** a person who is registered for week N marks themselves as no longer attending
- **THEN** their registration for week N is deleted immediately and their own access to week N's room assignments and notes ends

### Requirement: Registration is the access gate for the week
The system SHALL grant access to a week's room assignments and notes only to people who have a registration for that week.

#### Scenario: Registered person gains access
- **WHEN** a person has a registration for week N
- **THEN** they can view and edit week N's room assignments and notes

#### Scenario: Unregistered person is denied access
- **WHEN** a person has no registration for week N
- **THEN** they cannot view or edit week N's room assignments or notes

### Requirement: Anyone can see who else is checked in for a week
The system SHALL let any authenticated person see the list of people registered for a given week, displaying each person's display name (falling back to their email if they haven't set one).

#### Scenario: Viewing the check-in list
- **WHEN** an authenticated person looks at a beach week
- **THEN** they see everyone currently registered for that week, by name (or email if no name is set)
