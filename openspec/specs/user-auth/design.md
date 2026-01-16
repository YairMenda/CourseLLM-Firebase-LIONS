# User Authentication Design

Technical design decisions for the authentication system.

## Architecture

### Client-Side Authentication
- Firebase Auth SDK handles OAuth flows
- `AuthProviderClient.tsx` provides React Context for auth state
- `RoleGuardClient.tsx` enforces route protection

### Server-Side Authentication
- Firebase Admin SDK for token minting (test routes)
- Admin SDK bypasses Firestore security rules for privileged operations

## Key Components

| Component | Path | Purpose |
|-----------|------|---------|
| Firebase Init | `src/lib/firebase.ts` | App, Auth, Firestore instances |
| Auth Service | `src/lib/authService.ts` | Sign-in/out functions |
| Auth Provider | `src/components/AuthProviderClient.tsx` | React context for auth state |
| Role Guard | `src/components/RoleGuardClient.tsx` | Route protection |
| Auth Redirector | `src/components/AuthRedirector.tsx` | Root-level navigation |

## Data Model

### User Profile (`users/{uid}`)
```typescript
type Profile = {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: 'student' | 'teacher';
  department?: string;
  courses?: string[];
  authProviders?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  profileComplete?: boolean;
}
```

## Authentication Flow

```
User clicks "Sign in with Google"
         ↓
signInWithGoogle() → popup or redirect OAuth
         ↓
Firebase Auth session established
         ↓
onAuthStateChanged triggers
         ↓
AuthProviderClient loads Firestore profile
         ↓
Check profile completeness
         ↓
  ├─ Incomplete → redirect /onboarding
  └─ Complete → redirect /{role} dashboard
```

## Security Decisions

1. **Popup with Redirect Fallback**: Popup is preferred for UX; redirect handles browser restrictions
2. **Profile in Firestore**: Allows flexible schema and real-time sync
3. **Test Route Guard**: `ENABLE_TEST_AUTH` must be disabled in production
4. **Client Isolation**: Firestore rules prevent cross-user profile access

