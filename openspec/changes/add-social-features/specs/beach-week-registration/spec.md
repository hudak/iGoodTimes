## Purpose

Lets an authenticated account holder register their attendance for a beach week; that registration is the sole gate for accessing that week's room assignments and notes.

## ADDED Requirements

### Requirement: Authenticated person can register attendance for a week
The system SHALL let an authenticated account holder submit a registration for a beach week consisting of the week and a free-text list of attendees.

#### Scenario: Submit a sign-up
- **WHEN** an authenticated person selects a beach week, enters free-text attendees, and submits
- **THEN** a registration record is created linking that person to that week with the attendee text they entered

### Requirement: Registration is editable in place
The system SHALL allow an account holder to update their existing registration for a week rather than creating a duplicate.

#### Scenario: Resubmit for an already-registered week
- **WHEN** a person submits a sign-up for a week they have already registered for
- **THEN** their existing registration's attendee text is updated and no second registration is created

### Requirement: Registration is the access gate for the week
The system SHALL grant access to a week's room assignments and notes only to people who have a registration for that week.

#### Scenario: Registered person gains access
- **WHEN** a person has a registration for week N
- **THEN** they can view and edit week N's room assignments and notes

#### Scenario: Unregistered person is denied access
- **WHEN** a person has no registration for week N
- **THEN** they cannot view or edit week N's room assignments or notes

### Requirement: Attendees without accounts are represented as free text only
The system SHALL represent attendees who have no account (e.g. kids, guests) as free text within a registration, never as their own account or access record.

#### Scenario: Listing a dependent with no account
- **WHEN** a registering person includes a person without an account in their free-text attendee list
- **THEN** no account, login, or independent access grant is created for that person — they exist only as text within the registering person's entry
