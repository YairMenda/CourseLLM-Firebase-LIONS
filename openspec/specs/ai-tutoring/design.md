# AI Tutoring Design

Technical design decisions for Socratic tutoring and personalized assessment.

## Architecture

### Genkit Configuration
- Model: `gemini-2.5-flash` (default)
- Configuration: `src/ai/genkit.ts`
- All flows use `"use server"` directive

### Components

| Component | Path | Purpose |
|-----------|------|---------|
| Genkit Config | `src/ai/genkit.ts` | Model and plugin setup |
| Socratic Chat | `src/ai/flows/socratic-course-chat.ts` | Tutoring flow |
| Assessment | `src/ai/flows/personalized-learning-assessment.ts` | Analysis flow |
| Chat Panel | `src/app/student/courses/[courseId]/_components/chat-panel.tsx` | UI |

## Socratic Chat Flow

```
Input: courseMaterial, studentQuestion
               ↓
    socraticCourseChatFlow
               ↓
      Generate Socratic response
               ↓
      enforceCompliance tool
      (validate against course material)
               ↓
Output: response (guidance, not direct answers)
```

### Compliance Tool

The `enforceCompliance` tool validates AI responses:
- Ensures answers stay within course material bounds
- Prevents hallucination or off-topic content
- Maintains educational integrity

## Personalized Assessment Flow

```
Input: studentLearningPath, courseContent, 
       studentQuestionsAndAnswers, learningObjectives
                    ↓
        personalizedAssessmentFlow
                    ↓
        Analyze strengths/weaknesses
                    ↓
Output: assessment, suggestedAreasForImprovement
```

## Design Decisions

1. **Socratic Method**: Guides discovery rather than giving answers—better learning outcomes
2. **Course Material Grounding**: AI constrained to provided content prevents misinformation
3. **Server-Side Execution**: Protects API keys and controls costs
4. **Zod Validation**: Type-safe input/output prevents runtime errors

## Prompt Engineering Patterns

### Socratic Prompt Elements
- "Guide the student to discover the answer"
- "Ask thought-provoking follow-up questions"
- "Only use information from the provided course material"
- "Never give direct answers when a question could lead to insight"

### Assessment Prompt Elements
- "Analyze the student's learning path and Q&A history"
- "Identify strengths and areas needing improvement"
- "Provide actionable, specific recommendations"

