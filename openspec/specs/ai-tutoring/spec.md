# AI Tutoring

Specification for AI-powered Socratic tutoring and personalized learning assessment in CourseLLM.

## Requirements

### Requirement: Socratic Course Chat
The system SHALL provide AI-powered Socratic tutoring that guides students through course material with thought-provoking questions rather than direct answers.

#### Scenario: Student asks course question
- **WHEN** student submits question via course chat
- **AND** provides courseMaterial context
- **THEN** AI responds with Socratic-style guidance
- **AND** response stays within bounds of provided course material

#### Scenario: Socratic teaching method
- **WHEN** AI generates response
- **THEN** response guides student to discover answers
- **AND** asks thought-provoking follow-up questions
- **AND** avoids giving direct answers when possible

#### Scenario: Course material compliance
- **WHEN** AI generates response
- **THEN** `enforceCompliance` tool validates response
- **AND** ensures answers are accurate and relevant to course content
- **AND** rejects responses that go beyond provided material

---

### Requirement: Personalized Learning Assessment
The system SHALL analyze student progress and generate personalized improvement recommendations.

#### Scenario: Generate personalized assessment
- **WHEN** `personalizedAssessmentFlow` is called
- **AND** provided with studentLearningPath, courseContent, studentQuestionsAndAnswers, learningObjectives
- **THEN** AI analyzes student performance
- **AND** returns assessment with strengths and weaknesses
- **AND** returns suggestedAreasForImprovement

#### Scenario: Assessment input requirements
- **WHEN** generating assessment
- **THEN** system requires: studentLearningPath (topics covered), courseContent (materials), studentQuestionsAndAnswers (Q&A history), learningObjectives (teacher-defined)

#### Scenario: Assessment output structure
- **WHEN** assessment is generated
- **THEN** output includes: assessment (analysis text), suggestedAreasForImprovement (recommendations)

---

### Requirement: AI Model Configuration
The system SHALL use Google Genkit with configurable AI models for all tutoring features.

#### Scenario: Default model configuration
- **WHEN** AI flow is executed
- **THEN** `gemini-2.5-flash` model is used by default
- **AND** model is configured via `src/ai/genkit.ts`

#### Scenario: Server-side execution
- **WHEN** AI flow is invoked
- **THEN** execution occurs server-side only
- **AND** flows marked with `"use server"` directive

---

### Requirement: Chat Interface
The system SHALL provide a chat panel interface for students to interact with the AI tutor.

#### Scenario: Course chat panel
- **WHEN** student views course page at `/student/courses/[courseId]`
- **THEN** chat panel is available for AI tutoring
- **AND** student can submit questions about course content

#### Scenario: Chat message persistence
- **WHEN** student sends message in chat
- **THEN** conversation history is maintained during session
- **AND** context is passed to AI for coherent responses

