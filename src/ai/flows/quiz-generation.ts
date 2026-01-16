"use server";

import { ai } from "@/ai/genkit";
import { z } from "genkit";

const QuizGenerationInputSchema = z.object({
  courseTitle: z.string(),
  learningObjectives: z.array(z.string()),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  count: z.number().default(5),
  customPrompt: z
    .string()
    .optional()
    .describe(
      "Optional custom user prompt for specific topics or content to focus on"
    ),
});

export type QuizGenerationInput = z.infer<typeof QuizGenerationInputSchema>;

const GeneratedQuestionSchema = z.object({
  text: z.string(),
  type: z
    .enum(["multiple_choice", "free_text"])
    .describe("The type of question"),
  // For multiple choice questions
  options: z
    .array(z.string())
    .optional()
    .describe("Options for multiple choice questions"),
  correctAnswerIndex: z
    .number()
    .optional()
    .describe("Correct answer index for multiple choice questions"),
  // For free text questions
  expectedAnswer: z
    .string()
    .optional()
    .describe("Expected answer or key points for free text questions"),
  gradingCriteria: z
    .string()
    .optional()
    .describe("Criteria for grading free text answers"),
  // Common fields
  learningObjectiveIndex: z
    .number()
    .describe("The index of the input learning objective this question tests"),
  explanation: z.string(),
});

const QuizGenerationOutputSchema = z.object({
  questions: z.array(GeneratedQuestionSchema),
});

export type QuizGenerationOutput = z.infer<typeof QuizGenerationOutputSchema>;
export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;

const quizGenerationPrompt = ai.definePrompt({
  name: "quizGenerationPrompt",
  input: { schema: QuizGenerationInputSchema },
  output: { schema: QuizGenerationOutputSchema },
  prompt: `You are an expert curriculum developer. Generate a quiz for the course "{{{courseTitle}}}".
  
  Target Learning Objectives:
  {{#each learningObjectives}}
  - {{this}}
  {{/each}}
  
  Difficulty: {{{difficulty}}}
  Number of Questions: {{{count}}}
  
  {{#if customPrompt}}
  IMPORTANT - User's Custom Request:
  The user has specifically requested the following focus areas or topics for this quiz:
  "{{{customPrompt}}}"
  
  Please prioritize generating questions that address the user's specific request while still aligning with the learning objectives above.
  {{/if}}
  
  QUESTION TYPES:
  Generate a mix of question types for variety:
  
  1. Multiple Choice Questions (type: "multiple_choice"):
     - Provide 4 options in the "options" array
     - Set "correctAnswerIndex" to the index (0-3) of the correct answer
     - Do NOT include "expectedAnswer" or "gradingCriteria"
  
  2. Free Text Questions (type: "free_text"):
     - Do NOT include "options" or "correctAnswerIndex"
     - Provide "expectedAnswer" with the ideal answer or key points
     - Provide "gradingCriteria" explaining how to evaluate the student's response
  
  Aim for approximately 60% multiple choice and 40% free text questions.
  
  For all questions:
  - Create questions that test understanding of the learning objectives
  - Provide an explanation for the correct/expected answer
  - Indicate which Learning Objective (by index, 0-based) each question primarily targets`,
});

export const generateQuizFlow = ai.defineFlow(
  {
    name: "generateQuizFlow",
    inputSchema: QuizGenerationInputSchema,
    outputSchema: QuizGenerationOutputSchema,
  },
  async (input) => {
    const { output } = await quizGenerationPrompt(input);
    return output!;
  }
);
