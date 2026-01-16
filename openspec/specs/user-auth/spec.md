# User Authentication

Specification for user authentication, authorization, and onboarding in CourseLLM.

## Requirements

### Requirement: Google OAuth Sign-In
The system SHALL allow users to authenticate using Google OAuth via Firebase Authentication.

#### Scenario: Successful popup sign-in
- **WHEN** user clicks "Sign in with Google"
- **AND** completes Google OAuth in popup
- **THEN** Firebase Auth session is established
- **AND** user is redirected based on profile state

#### Scenario: Popup blocked fallback
- **WHEN** user clicks "Sign in with Google"
- **AND** browser blocks popup
- **THEN** system falls back to redirect-based OAuth flow

#### Scenario: Sign-in error handling
- **WHEN** OAuth fails (network, cancelled, etc.)
- **THEN** system displays appropriate error message
- **AND** user remains on login page

---

### Requirement: User Profile Management
The system SHALL maintain user profiles in Firestore at `users/{uid}` with role, department, and course information.

#### Scenario: Profile structure
- **WHEN** user profile exists
- **THEN** profile contains: uid, email, displayName, photoURL, role, department, courses, authProviders, createdAt, updatedAt

#### Scenario: Profile completeness check
- **WHEN** profile is evaluated for completeness
- **THEN** profile is complete if role is student|teacher, department is non-empty, and courses is non-empty array

---

### Requirement: First-Time User Onboarding
The system SHALL redirect first-time users to onboarding to collect role, department, and course preferences.

#### Scenario: New user detection
- **WHEN** user signs in
- **AND** `creationTime === lastSignInTime` in Firebase metadata
- **THEN** user is redirected to `/onboarding`

#### Scenario: Missing profile detection
- **WHEN** user is authenticated
- **AND** no `users/{uid}` document exists
- **THEN** `onboardingRequired` flag is set to true
- **AND** user is redirected to `/onboarding`

#### Scenario: Onboarding completion
- **WHEN** user submits onboarding form with role, department, and courses
- **THEN** profile is saved to Firestore with `profileComplete: true`
- **AND** user is redirected to role-appropriate dashboard

---

### Requirement: Role-Based Access Control
The system SHALL restrict access to dashboards based on user role (student or teacher).

#### Scenario: Student accessing student dashboard
- **WHEN** authenticated user with role=student
- **AND** navigates to `/student/*`
- **THEN** access is granted

#### Scenario: Teacher accessing teacher dashboard
- **WHEN** authenticated user with role=teacher
- **AND** navigates to `/teacher/*`
- **THEN** access is granted

#### Scenario: Role mismatch redirect
- **WHEN** authenticated user with role=student
- **AND** navigates to `/teacher/*`
- **THEN** user is redirected to `/student`

#### Scenario: Unauthenticated access
- **WHEN** unauthenticated user
- **AND** navigates to protected route
- **THEN** user is redirected to `/login`

---

### Requirement: Sign-Out
The system SHALL allow users to sign out, clearing their session and redirecting to login.

#### Scenario: User signs out
- **WHEN** user clicks "Log out" in user menu
- **THEN** Firebase Auth session is cleared
- **AND** in-memory profile is cleared
- **AND** user is redirected to `/login`

---

### Requirement: Test Authentication (Development Only)
The system SHALL provide a test-only authentication route for E2E testing when `ENABLE_TEST_AUTH=true`.

#### Scenario: Test token generation
- **WHEN** `ENABLE_TEST_AUTH=true`
- **AND** request to `/api/test-token` with uid parameter
- **THEN** Firebase custom token is minted and returned

#### Scenario: Test profile creation
- **WHEN** test token request includes role and createProfile=true
- **THEN** user profile is created in Firestore via Admin SDK

#### Scenario: Production guard
- **WHEN** `ENABLE_TEST_AUTH` is not set or false
- **AND** request to `/api/test-token`
- **THEN** route returns 404 or is disabled

