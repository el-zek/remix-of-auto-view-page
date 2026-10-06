# Restore the auth choice screen

## Changes
- Make the authentication page open on the premium Sign up / Sign in choice screen.
- Keep the previous welcome artwork and brand treatment as the page background only.
- Open the existing sign-up or sign-in form after the user chooses an option.
- Add a clear way to return from either form to the choice screen, without restoring the old slide-to-continue welcome gate.
- Preserve all current authentication, registration, password-reset, and redirect behavior.

## Verification
- Check the initial mobile view shows both Sign up and Sign in choices immediately.
- Check each choice opens the correct form and can return to the choice screen.
- Confirm the page builds without errors.
