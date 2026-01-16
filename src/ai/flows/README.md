# AI Flows

This directory contains Genkit-powered AI flows that provide the intelligent backend for CourseLLM's learning features. All flows are server-side only (`"use server"`) and use structured input/output schemas with Zod validation.

## Overview

| Flow | Purpose |
|------|---------|
| `quiz-generation.ts` | Generates AI-powered quizzes based on course content |
| `quiz-grading.ts` | Grades submitted quizzes with detailed feedback |
| `personalized-learning-assessment.ts` | Creates personalized learning assessments |
| `socratic-course-chat.ts` | Implements Socratic tutoring conversations |

---

## Quiz Generation

**File:** `quiz-generation.ts`  
**Flow:** `generateQuizFlow`

Generates a mix of multiple-choice and free-text questions based on course learning objectives.

### Input Schema

```typescript
{
  courseTitle: string;
  learningObjectives: string[];
  difficulty: "easy" | "medium" | "hard"; // default: "medium"
  count: number; // default: 5
  customPrompt?: string; // Optional focus areas or topics
}
```

### Output Schema

```typescript
{
  questions: Array<{
    text: string;
    type: "multiple_choice" | "free_text";
    // Multiple choice fields
    options?: string[];
    correctAnswerIndex?: number;
    // Free text fields
    expectedAnswer?: string;
    gradingCriteria?: string;
    // Common fields
    learningObjectiveIndex: number;
    explanation: string;
  }>;
}
```

### Question Distribution
- ~60% multiple choice questions
- ~40% free text questions

---

## Quiz Grading

**File:** `quiz-grading.ts`  
**Flow:** `gradeQuizFlow`

Grades student quiz submissions with AI-powered evaluation and learning objective tracking.

### Input Schema

```typescript
{
  quizId: string;
  questions: Array<{
    questionId: string;
    text: string;
    type: "multiple_choice" | "free_text";
    // Multiple choice
    correctAnswerIndex?: number;
    studentAnswerIndex?: number;
    // Free text
    expectedAnswer?: string;
    gradingCriteria?: string;
    studentTextAnswer?: string;
    // Tracking
    learningObjectiveId?: string;
  }>;
}
```

### Output Schema

```typescript
{
  score: number; // Multiple choice score only
  totalQuestions: number; // Multiple choice count only
  feedback: string; // Overall feedback
  loUpdates: Array<{
    loId: string;
    delta: number; // Mastery change: +15 correct, -5 incorrect
    reasoning: string;
  }>;
  freeTextGrades: Array<{
    questionIndex: number;
    score: number; // 0-10 scale
    feedback: string; // Detailed feedback
  }>;
}
```

### Grading Logic
- **Multiple Choice:** Binary correct/incorrect scoring
- **Free Text:** Scored 0-10 with detailed feedback
- **Learning Objectives:** Updated based on performance (+15 correct MC, -5 incorrect, +5 to +10 for high free text scores)

---

## Personalized Learning Assessment

**File:** `personalized-learning-assessment.ts`  
**Flow:** `personalizedAssessmentFlow`  
**Export:** `generatePersonalizedAssessment(input)`

Analyzes student progress and generates personalized improvement recommendations.

### Input Schema

```typescript
{
  studentLearningPath: string; // Topics covered and interactions
  courseContent: string; // Complete course materials
  studentQuestionsAndAnswers: string; // Q&A history
  learningObjectives: string; // Teacher-defined objectives
}
```

### Output Schema

```typescript
{
  assessment: string; // Strengths and weaknesses analysis
  suggestedAreasForImprovement: string; // Focused recommendations
}
```

---

## Socratic Course Chat

**File:** `socratic-course-chat.ts`  
**Flow:** `socraticCourseChatFlow`  
**Export:** `socraticCourseChat(input)`

Implements a Socratic tutoring experience that guides students through course material with thought-provoking questions.

### Input Schema

```typescript
{
  courseMaterial: string; // Relevant course content
  studentQuestion: string; // Student's question
}
```

### Output Schema

```typescript
{
  response: string; // Socratic-style guidance
}
```

### Compliance Tool

The flow includes an `enforceCompliance` tool that validates AI responses stay within the bounds of provided course material, ensuring accurate and relevant tutoring.

---

## Usage

All flows are designed to be called from server actions or API routes:

```typescript
import { generateQuizFlow } from "@/ai/flows/quiz-generation";
import { gradeQuizFlow } from "@/ai/flows/quiz-grading";

// Generate a quiz
const { questions } = await generateQuizFlow({
  courseTitle: "React Fundamentals",
  learningObjectives: ["Understand hooks", "Manage state"],
  difficulty: "medium",
  count: 5,
});

// Grade a submission
const results = await gradeQuizFlow({
  quizId: "quiz-123",
  questions: formattedQuestions,
});
```

## Architecture

```
┌─────────────────┐     ┌──────────────────┐
│   Client/UI     │────▶│  Server Action   │
└─────────────────┘     └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                        │   Genkit Flow    │
                        │  (this folder)   │
                        └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                        │   Google AI      │
                        │  (Gemini model)  │
                        └──────────────────┘
```

