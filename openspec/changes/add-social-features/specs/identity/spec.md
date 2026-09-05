## Purpose

Establishes who can sign in to the app and how accounts are created, as a layer that sits additively on top of the existing public calendar without ever requiring sign-in to view it.

## ADDED Requirements

### Requirement: Public calendar requires no authentication
The system SHALL allow anyone to view the beach week calendar (dates, search, countdown) without signing in.

#### Scenario: Unauthenticated visit
- **WHEN** a visitor loads the app without signing in
- **THEN** they see the full public calendar with no login prompt and no degraded functionality

### Requirement: Account creation is admin-managed
The system SHALL only allow new accounts to be created by an admin action; there SHALL be no self-service account creation.

#### Scenario: Admin creates an account
- **WHEN** an admin invites a person by email
- **THEN** that person can complete sign-in using the invite, and a corresponding account record is created for them automatically

#### Scenario: No self-service signup is offered
- **WHEN** an unauthenticated visitor looks for a way to create their own account
- **THEN** no such option is presented anywhere in the app

### Requirement: Passwordless sign-in
The system SHALL let an existing account holder sign in using a one-time email link or code, without a password.

#### Scenario: Returning account holder signs in
- **WHEN** an existing account holder requests to sign in with their email
- **THEN** they receive a one-time link or code and are signed in upon using it, without ever entering a password

### Requirement: Sign-in state persists across visits
The system SHALL keep a signed-in person authenticated across page reloads and future visits until they sign out or their session expires.

#### Scenario: Returning to the app while signed in
- **WHEN** a signed-in person reloads the app or returns later within their session's validity
- **THEN** they remain signed in without being asked to sign in again
