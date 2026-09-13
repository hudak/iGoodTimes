# Identity Specification

## Purpose

Establishes who can sign in to the app and how accounts are created, as a layer that sits additively on top of the existing public calendar without ever requiring sign-in to view it.

## Requirements

### Requirement: Public calendar requires no authentication
The system SHALL allow anyone to view the beach week calendar (dates, search, countdown) without signing in.

#### Scenario: Unauthenticated visit
- **WHEN** a visitor loads the app without signing in
- **THEN** they see the full public calendar with no login prompt and no degraded functionality

### Requirement: Account creation is admin-managed
The system SHALL only allow new accounts to be created by an admin action; there SHALL be no self-service account creation.

#### Scenario: Admin creates an account
- **WHEN** an admin adds a person by entering their email (creating their `users` record)
- **THEN** that person can sign in with that email using any available method, and no account is created as a side effect of their sign-in

#### Scenario: No self-service signup is offered
- **WHEN** an unauthenticated visitor looks for a way to create their own account
- **THEN** no such option is presented anywhere in the app

#### Scenario: Federated sign-in does not create an account
- **WHEN** someone successfully authenticates with a supported federated identity provider but no account exists for their verified email
- **THEN** no account is created for them, sign-in fails, and they see a message directing them to ask an admin for access

### Requirement: Passwordless sign-in
The system SHALL let an existing account holder sign in without ever entering a password on this app, using either a one-time email code or a supported federated identity provider (e.g. Google).

#### Scenario: Returning account holder signs in
- **WHEN** an existing account holder requests to sign in with their email
- **THEN** they receive a one-time code and are signed in upon using it, without ever entering a password

#### Scenario: Returning account holder signs in with a federated provider
- **WHEN** an existing account holder completes sign-in with a supported federated identity provider, authenticating with the email address on their account
- **THEN** they are signed in without ever entering a password on this app

### Requirement: Sign-in succeeds only for a pre-approved account
The system SHALL require every sign-in attempt, regardless of which authentication method is used, to resolve to an account that already exists. No authentication method SHALL be able to create an account as a side effect of a successful sign-in.

#### Scenario: Consistent refusal across methods
- **WHEN** someone without an account attempts to sign in, by any available method
- **THEN** sign-in fails for all of them, and no account is created by any method

#### Scenario: A new authentication method is added later
- **WHEN** an additional sign-in method (e.g. another federated provider) is enabled
- **THEN** authenticating with it still only succeeds for someone who already has an account, with no new account created as a side effect

### Requirement: Sign-in sends only the one-time code, never a security-alert email
The system SHALL send exactly one email during any sign-in: the one-time code an account holder must enter to complete OTP sign-in. It SHALL NOT send any "new device" or "login from a new location" security-alert email, regardless of whether the device or location is new.

#### Scenario: Signing in from a new device
- **WHEN** an existing account holder signs in from a device or location the system has not seen before
- **THEN** no security-alert email is sent, and sign-in completes normally

#### Scenario: OTP sign-in still delivers its code
- **WHEN** an existing account holder requests to sign in with their email
- **THEN** the one-time code email is still delivered, and that is the only email that sign-in attempt produces

### Requirement: Sign-in state persists across visits
The system SHALL keep a signed-in person authenticated across page reloads and future visits until they sign out or their session expires.

#### Scenario: Returning to the app while signed in
- **WHEN** a signed-in person reloads the app or returns later within their session's validity
- **THEN** they remain signed in without being asked to sign in again

### Requirement: An account holder can set their own display name
The system SHALL let a signed-in person set or change a display name on their own account, shown instead of their email address wherever people are listed elsewhere in the app.

#### Scenario: Setting a display name
- **WHEN** a signed-in person sets a display name for themselves
- **THEN** that name is shown for them (instead of their email) in any list of people, such as who's checked in for a beach week

#### Scenario: No display name set yet
- **WHEN** a person has not set a display name
- **THEN** their email address is shown in their place
