# Quiz System Design

Technical design decisions for the quiz generation and grading system.

## Architecture

### AI Flow Execution
- All quiz flows run server-side (`"use server"`)
- Google Genkit orchestrates LLM interactions
- Zod schemas validate input/output

### Components

| Component | Path | Purpose |
|-----------|------|---------|
| Quiz Generation | `src/ai/flows/quiz-generation.ts` | Generate quiz questions |
| Quiz Grading | `src/ai/flows/quiz-grading.ts` | Grade submissions |
| Quiz Service | `src/services/quiz-service.ts` | Business logic layer |
| Assessment Client | `src/app/student/assessments/_components/assessment-client.tsx` | UI |

## Quiz Generation Flow

```
Input: courseTitle, learningObjectives, difficulty, count
                    ↓
        generateQuizFlow (Genkit)
                    ↓
          Gemini generates questions
                    ↓
        Validate against QuizOutputSchema
                    ↓
Output: Array of questions with types and metadata
```

### Question Types

**Multiple Choice**
```typescript
{
  text: string;
  type: "multiple_choice";
  options: string[];           // 4 options
  correctAnswerIndex: number;  // 0-3
  learningObjectiveIndex: number;
  explanation: string;
}
```

**Free Text**
```typescript
{
  text: string;
  type: "free_text";
  expectedAnswer: string;
  gradingCriteria: string;
  learningObjectiveIndex: number;
  explanation: string;
}
```

## Grading Flow

```
Input: quizId, questions with student answers
                    ↓
          gradeQuizFlow (Genkit)
                    ↓
   ├─ MC: Compare indices → binary score
   └─ FT: AI evaluates → 0-10 score + feedback
                    ↓
      Calculate learning objective deltas
                    ↓
Output: score, feedback, loUpdates, freeTextGrades
```

### Mastery Delta Calculation

| Condition | Delta |
|-----------|-------|
| MC correct | +15 |
| MC incorrect | -5 |
| FT score 8-10 | +10 |
| FT score 5-7 | +5 |
| FT score <5 | 0 |

## Design Decisions

1. **Server-Side Only**: AI flows never exposed to client for security and cost control
2. **60/40 Question Mix**: Balances quick assessment (MC) with deeper understanding (FT)
3. **Per-LO Tracking**: Enables fine-grained progress analysis
4. **Explanation Field**: Supports learning even when wrong

