# Student Assessments

This directory contains the quiz and assessment feature for students, enabling AI-generated quizzes, real-time grading, and progress tracking.

## Directory Structure

```
assessments/
├── page.tsx                    # Main assessments dashboard
├── _components/
│   └── assessment-client.tsx   # Dashboard client component
└── [quizId]/
    ├── page.tsx                # Dynamic quiz page (server component)
    └── _components/
        └── quiz-client.tsx     # Quiz-taking interface
```

---

## Pages

### `/student/assessments` - Assessments Dashboard

The main landing page for student assessments featuring:

- **Stats Overview:** Quizzes completed, average score, available courses
- **Take a Quiz Tab:** Browse courses and generate AI-powered quizzes
- **Quiz History Tab:** Review past attempts with detailed results

#### Quiz Generation Modes

1. **AI-Generated Quiz:** Automatic question generation from course learning objectives
2. **Custom Focus Quiz:** Student specifies topics or concepts to be tested on

### `/student/assessments/[quizId]` - Quiz Taking

Dynamic route for taking individual quizzes. Supports two URL patterns:

| Pattern | Description |
|---------|-------------|
| `/assessments/{firestoreId}` | Load existing quiz from Firestore |
| `/assessments/new-{courseId}` | Generate new quiz for a course |

---

## Components

### `AssessmentClient`

Main dashboard component (`_components/assessment-client.tsx`) that handles:

- Course listing with quiz availability
- Quiz history loading from Firestore
- Quiz mode selection dialog (AI-only vs custom prompt)
- Quiz result review modal with detailed answer breakdown

#### Key Features

- **Question Type Support:** Multiple choice + free text questions
- **Score Visualization:** Color-coded pass/fail indicators (≥70% = pass)
- **AI Feedback Display:** Shows per-question and overall AI feedback
- **Free Text Grading:** Displays 0-10 scores with detailed evaluation

### `QuizClient`

Quiz-taking interface (`[quizId]/_components/quiz-client.tsx`) that provides:

- Progressive question navigation with progress bar
- Multiple choice option selection with visual feedback
- Free text answer input with textarea
- Real-time grading submission
- Results display with learning impact metrics

---

## Data Flow

```
┌──────────────────┐
│  AssessmentClient │
│   (Dashboard)     │
└────────┬─────────┘
         │ Navigate to quiz
         ▼
┌──────────────────┐     ┌──────────────────┐
│   QuizClient     │────▶│   quiz-service   │
│  (Take Quiz)     │     │    (Service)     │
└──────────────────┘     └────────┬─────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
           ┌──────────────┐            ┌──────────────┐
           │   Firestore   │            │   AI Flows   │
           │  (Persist)    │            │  (Generate/  │
           └──────────────┘            │    Grade)    │
                                       └──────────────┘
```

---

## Question Types

### Multiple Choice

```typescript
{
  text: string;
  type: "multiple_choice";
  options: string[]; // 4 options
  correctAnswerIndex: number; // 0-3
  explanation: string;
}
```

- Binary scoring (correct/incorrect)
- Visual indication of correct/wrong answers on review

### Free Text

```typescript
{
  text: string;
  type: "free_text";
  expectedAnswer: string;
  gradingCriteria: string;
  explanation: string;
}
```

- AI-graded on 0-10 scale
- Detailed feedback explaining score
- Expected answer shown on review

---

## State Management

### Quiz States

| Status | Description |
|--------|-------------|
| `loading` | Generating or fetching quiz |
| `ready` | Quiz loaded, student answering |
| `submitting` | Answers submitted, awaiting grading |
| `results` | Grading complete, showing results |

### Answer Storage

```typescript
// Multiple choice answers (question index → option index)
answers: Record<number, number>

// Free text answers (question index → text response)
textAnswers: Record<number, string>
```

---

## Authentication

All quiz operations require authentication via `useAuth()`:

- Quiz generation requires `firebaseUser.uid`
- Quiz submission requires `firebaseUser.uid`
- Quiz history filtered by authenticated user

---

## Services Used

- **`generateQuiz(userId, courseId, customPrompt?)`** - Creates new quiz
- **`submitQuiz(userId, quizId, answers, textAnswers)`** - Submits for grading
- **`getQuiz(quizId)`** - Fetches quiz data
- **`getStudentQuizzes(userId)`** - Fetches quiz history

All services are imported from `@/services/quiz-service`.

---

## UI Components Used

From `@/components/ui`:
- `Card`, `Button`, `Badge`, `Tabs`
- `Dialog` (mode selection, result review)
- `RadioGroup` (multiple choice)
- `Textarea` (free text answers)
- `Progress` (question progress)
- `ScrollArea` (review modal)

