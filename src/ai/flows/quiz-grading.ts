"use server";

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const QuestionResultInputSchema = z.object({
  questionId: z.string(),
  text: z.string(),
  type: z.enum(["multiple_choice", "free_text"]).default("multiple_choice"),
  // For multiple choice
  correctAnswerIndex: z.number().optional(),
  studentAnswerIndex: z.number().optional(),
  // For free text
  expectedAnswer: z.string().optional(),
  gradingCriteria: z.string().optional(),
  studentTextAnswer: z.string().optional(),
  // Common
  learningObjectiveId: z.string().optional(),
});

const QuizGradingInputSchema = z.object({
  quizId: z.string(),
  questions: z.array(QuestionResultInputSchema),
});

export type QuizGradingInput = z.infer<typeof QuizGradingInputSchema>;

const LOUpdateSchema = z.object({
  loId: z.string(),
  delta: z
    .number()
    .describe("Percentage point change (e.g., +10, -5) based on performance"),
  reasoning: z.string(),
});

const FreeTextGradeSchema = z.object({
  questionIndex: z.number().describe("The index of the free text question"),
  score: z.number().min(0).max(10).describe("Score out of 10 for this answer"),
  feedback: z
    .string()
    .describe("Detailed feedback explaining the grade and how to improve"),
});

const QuizGradingOutputSchema = z.object({
  score: z.number().describe("Total score for MULTIPLE CHOICE questions only"),
  totalQuestions: z
    .number()
    .describe("Count of MULTIPLE CHOICE questions only"),
  feedback: z.string().describe("Overall feedback for the student"),
  loUpdates: z.array(LOUpdateSchema),
  freeTextGrades: z
    .array(FreeTextGradeSchema)
    .describe("Individual grades for each free text question"),
});

export type QuizGradingOutput = z.infer<typeof QuizGradingOutputSchema>;
export type FreeTextGrade = z.infer<typeof FreeTextGradeSchema>;

const quizGradingPrompt = ai.definePrompt({
  name: "quizGradingPrompt",
  input: { schema: QuizGradingInputSchema },
  output: { schema: QuizGradingOutputSchema },
  prompt: `You are an AI tutor grading a student quiz.
  
  Quiz ID: {{{quizId}}}
  
  Student Answers:
  {{#each questions}}
  - Question {{@index}}: {{text}}
    - Type: {{type}}
    - Correct Answer Index: {{correctAnswerIndex}}
    - Student Answer Index: {{studentAnswerIndex}}
    - Expected Answer: {{expectedAnswer}}
    - Grading Criteria: {{gradingCriteria}}
    - Student's Text Answer: "{{studentTextAnswer}}"
    - Learning Objective ID: {{learningObjectiveId}}
  {{/each}}
  
  GRADING INSTRUCTIONS:
  
  IMPORTANT: The "score" and "totalQuestions" fields should ONLY count MULTIPLE CHOICE questions.
  Free text questions are graded separately in the "freeTextGrades" array.
  
  1. For "multiple_choice" questions ONLY:
     - Compare studentAnswerIndex with correctAnswerIndex
     - If they match: 1 point (correct)
     - If they don't match: 0 points (incorrect)
     - Add up all correct answers for the "score" field
     - Count total multiple choice questions for "totalQuestions" field
     
  2. For "free_text" questions (graded separately):
     - For EACH free text question, add an entry to "freeTextGrades" array with:
       - questionIndex: the index of this question (0-based)
       - score: a grade from 0-10 based on accuracy, completeness, and understanding
       - feedback: detailed, constructive feedback explaining:
         * What the student did well
         * What was missing or incorrect
         * How they can improve their answer
     - DO NOT include free text questions in the main "score" or "totalQuestions"
  
  3. Provide encouraging but constructive overall feedback that:
     - Acknowledges what the student did well on both question types
     - Offers specific guidance for improvement
  
  4. Determine how the student's mastery of linked Learning Objectives (LOs) should change:
     - Based on multiple choice: correct (+15), incorrect (-5)
     - Based on free text scores: high score 8-10 (+10), medium 5-7 (+5), low 0-4 (-5)
  `,
});

export const gradeQuizFlow = ai.defineFlow(
  {
    name: "gradeQuizFlow",
    inputSchema: QuizGradingInputSchema,
    outputSchema: QuizGradingOutputSchema,
  },
  async (input) => {
    const { output } = await quizGradingPrompt(input);
    return output!;
  }
);
