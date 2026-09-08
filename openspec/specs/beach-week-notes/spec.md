# Beach Week Notes Specification

## Purpose

Lets people who registered for a beach week write and read shared, per-day plain-text notes for that week.

## Requirements

### Requirement: Per-day note content
The system SHALL let a person registered for a week save plain-text content for a specific date within that week.

#### Scenario: Create or edit a note
- **WHEN** a registered person writes text for a specific date within their registered week
- **THEN** that text is saved as the note for that date

### Requirement: Notes are shared among everyone registered for the week
The system SHALL let every person registered for a week view and edit the same set of per-day notes for that week.

#### Scenario: Shared visibility
- **WHEN** multiple people are registered for the same week
- **THEN** each of them can view and edit the same per-day notes for that week

### Requirement: Latest content is shown on refocus
The system SHALL show the latest saved note content when a person returns focus to a note view, without requiring a live push mechanism.

#### Scenario: Refresh on refocus
- **WHEN** a person returns to a previously open note after someone else has updated it
- **THEN** they see the latest saved content once their view regains focus

### Requirement: Access requires registration for the week
The system SHALL only allow viewing or editing a week's notes to people registered for that week.

#### Scenario: Unregistered person is denied access
- **WHEN** a person has no registration for week N
- **THEN** they cannot view or edit notes for week N
