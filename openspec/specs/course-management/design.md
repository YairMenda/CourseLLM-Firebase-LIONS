# Course Management Design

Technical design decisions for course and dashboard features.

## Architecture

### Data Layer
- Firestore: User profiles, persistent storage
- DataConnect: GraphQL layer for typed queries
- Generated types: `src/dataconnect-generated/`

### UI Framework
- Next.js 15 with React 18
- Server and Client components
- Radix UI primitives with Tailwind CSS

## Key Components

| Component | Path | Purpose |
|-----------|------|---------|
| Student Layout | `src/app/student/layout.tsx` | Student route wrapper |
| Teacher Layout | `src/app/teacher/layout.tsx` | Teacher route wrapper |
| App Shell | `src/components/layout/app-shell.tsx` | Sidebar navigation |
| User Nav | `src/components/layout/user-nav.tsx` | User menu, sign-out |

## Route Structure

```
/student
├── /               → Student dashboard
├── /courses
│   └── /[courseId] → Course view with chat
├── /assessments
│   └── /[quizId]   → Quiz taking
└── /profile        → Profile view

/teacher
├── /               → Teacher dashboard
└── /courses
    └── /[courseId] → Course management
```

## Data Model

### Course Data (via DataConnect)

```graphql
type Course {
  id: ID!
  title: String!
  description: String
  learningObjectives: [String!]!
  instructorId: String!
}
```

### User Profile (Firestore)

Course enrollment stored in user profile:
```typescript
profile.courses: string[]  // Array of course IDs
```

## Component Patterns

### Server vs Client Components

**Server Components** (default):
- Page layouts
- Data fetching
- Static content

**Client Components** (`'use client'`):
- Interactive elements
- Auth state access
- Real-time updates

Naming convention: `*Client.tsx` suffix for client components.

### Responsive Design

- Mobile detection: `src/hooks/use-mobile.tsx`
- Sidebar collapse on mobile
- Touch-friendly navigation

## Design Decisions

1. **DataConnect for Typed Queries**: Auto-generated types reduce runtime errors
2. **Course List in Profile**: Simple enrollment model without separate join table
3. **Role in Layout**: Each role has dedicated layout for consistent navigation
4. **Radix + Tailwind**: Accessible primitives with utility styling

