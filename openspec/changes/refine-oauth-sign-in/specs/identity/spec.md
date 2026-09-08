## ADDED Requirements

### Requirement: Sign-in succeeds only for a pre-approved account
The system SHALL require every sign-in attempt, regardless of which authentication method is used, to resolve to an account that already exists. No authentication method SHALL be able to create an account as a side effect of a successful sign-in.

#### Scenario: Consistent refusal across methods
- **WHEN** someone without an account attempts to sign in, by any available method
- **THEN** sign-in fails for all of them, and no account is created by any method

#### Scenario: A new authentication method is added later
- **WHEN** an additional sign-in method (e.g. another federated provider) is enabled
- **THEN** authenticating with it still only succeeds for someone who already has an account, with no new account created as a side effect

## MODIFIED Requirements

### Requirement: Passwordless sign-in
The system SHALL let an existing account holder sign in without ever entering a password on this app, using either a one-time email code or a supported federated identity provider (e.g. Google).

#### Scenario: Returning account holder signs in
- **WHEN** an existing account holder requests to sign in with their email
- **THEN** they receive a one-time code and are signed in upon using it, without ever entering a password

#### Scenario: Returning account holder signs in with a federated provider
- **WHEN** an existing account holder completes sign-in with a supported federated identity provider, authenticating with the email address on their account
- **THEN** they are signed in without ever entering a password on this app

### Requirement: Account creation is admin-managed
The system SHALL only allow new accounts to be created by an admin action; there SHALL be no self-service account creation.

#### Scenario: Admin creates an account
- **WHEN** an admin invites a person by email
- **THEN** that person can complete sign-in using the invite, and a corresponding account record is created for them automatically

#### Scenario: No self-service signup is offered
- **WHEN** an unauthenticated visitor looks for a way to create their own account
- **THEN** no such option is presented anywhere in the app

#### Scenario: Federated sign-in does not create an account
- **WHEN** someone successfully authenticates with a supported federated identity provider but no account exists for their verified email
- **THEN** no account is created for them, sign-in fails, and they see a message directing them to ask an admin for access
