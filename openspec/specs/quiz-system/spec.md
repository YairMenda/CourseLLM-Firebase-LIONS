# Quiz System

Specification for AI-powered quiz generation, submission, and grading in CourseLLM.

## Requirements

### Requirement: AI Quiz Generation
The system SHALL generate quizzes with a mix of multiple-choice and free-text questions based on course content and learning objectives.

#### Scenario: Generate quiz with default settings
- **WHEN** `generateQuizFlow` is called with courseTitle and learningObjectives
- **THEN** quiz with 5 questions is returned (default count)
- **AND** difficulty defaults to "medium"
- **AND** approximately 60% multiple-choice, 40% free-text distribution

#### Scenario: Generate quiz with custom parameters
- **WHEN** `generateQuizFlow` is called with difficulty="hard" and count=10
- **THEN** quiz with 10 hard-difficulty questions is generated
- **AND** each question links to a learning objective via `learningObjectiveIndex`

#### Scenario: Multiple-choice question structure
- **WHEN** question type is "multiple_choice"
- **THEN** question includes: text, options array, correctAnswerIndex, explanation, learningObjectiveIndex

#### Scenario: Free-text question structure
- **WHEN** question type is "free_text"
- **THEN** question includes: text, expectedAnswer, gradingCriteria, explanation, learningObjectiveIndex

---

### Requirement: Quiz Grading
The system SHALL grade submitted quizzes with AI-powered evaluation and provide detailed feedback.

#### Scenario: Grade multiple-choice answers
- **WHEN** student submits multiple-choice answer
- **AND** `studentAnswerIndex === correctAnswerIndex`
- **THEN** question is marked correct
- **AND** learning objective mastery increases by +15

#### Scenario: Grade incorrect multiple-choice
- **WHEN** student submits multiple-choice answer
- **AND** `studentAnswerIndex !== correctAnswerIndex`
- **THEN** question is marked incorrect
- **AND** learning objective mastery decreases by -5

#### Scenario: Grade free-text answers
- **WHEN** student submits free-text answer
- **THEN** AI evaluates response against expectedAnswer and gradingCriteria
- **AND** score from 0-10 is assigned
- **AND** detailed feedback is provided
- **AND** learning objective mastery adjusted based on score (+5 to +10 for high scores)

#### Scenario: Grading results structure
- **WHEN** quiz is graded
- **THEN** results include: score, totalQuestions, feedback, loUpdates array, freeTextGrades array

---

### Requirement: Learning Objective Tracking
The system SHALL track student mastery of learning objectives based on quiz performance.

#### Scenario: Mastery update calculation
- **WHEN** quiz is graded
- **THEN** `loUpdates` array contains entries with: loId, delta (mastery change), reasoning

#### Scenario: Mastery delta range
- **WHEN** calculating mastery delta
- **THEN** correct multiple-choice adds +15
- **AND** incorrect multiple-choice subtracts -5
- **AND** free-text scores 8-10 add +10
- **AND** free-text scores 5-7 add +5

---

### Requirement: Quiz Persistence
The system SHALL persist quiz attempts and results for student progress tracking.

#### Scenario: Save quiz attempt
- **WHEN** student submits quiz
- **THEN** attempt is saved with timestamp, answers, and calculated score

#### Scenario: Retrieve quiz history
- **WHEN** student views assessment history
- **THEN** past quiz attempts and scores are displayed

---

### Requirement: Assessment Dashboard
The system SHALL provide students with a dashboard to view available and completed assessments.

#### Scenario: View available assessments
- **WHEN** student navigates to `/student/assessments`
- **THEN** list of available quizzes for enrolled courses is displayed

#### Scenario: View assessment details
- **WHEN** student navigates to `/student/assessments/[quizId]`
- **THEN** quiz questions are displayed for answering

