// Thrown by signInWithGoogle when the OAuth2 guard hook refused the sign-in
// because the Google address has no pre-approved `users` record. A distinct
// class so the form can show the "not approved" copy rather than a generic
// failure. Matched on the guard's HTTP 403, never on the message text.
export class NotApprovedError extends Error {
  constructor() {
    super('Not approved');
    this.name = 'NotApprovedError';
  }
}
