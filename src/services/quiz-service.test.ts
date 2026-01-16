/**
 * Quiz Service Unit Tests
 *
 * Tests all quiz service functions with mocked dependencies:
 * - Firebase Firestore operations
 * - AI flow calls (generateQuizFlow, gradeQuizFlow)
 * - Mock course data
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// HOISTED MOCKS - vi.hoisted ensures these are available during vi.mock
// ============================================================================

const {
  mockGetDoc,
  mockSetDoc,
  mockUpdateDoc,
  mockGetDocs,
  mockAddDoc,
  mockDoc,
  mockCollection,
  mockQuery,
  mockWhere,
  mockArrayUnion,
  mockTimestampNow,
  mockGenerateQuizFlow,
  mockGradeQuizFlow,
  mockCourses,
  mockLearningObjectives,
} = vi.hoisted(() => ({
  mockGetDoc: vi.fn(),
  mockSetDoc: vi.fn(),
  mockUpdateDoc: vi.fn(),
  mockGetDocs: vi.fn(),
  mockAddDoc: vi.fn(),
  mockDoc: vi.fn(),
  mockCollection: vi.fn(),
  mockQuery: vi.fn(),
  mockWhere: vi.fn(),
  mockArrayUnion: vi.fn((value: any) => ({ _arrayUnion: value })),
  mockTimestampNow: vi.fn(() => ({
    toDate: () => new Date("2026-01-16T12:00:00Z"),
    toMillis: () => 1736942400000,
  })),
  mockGenerateQuizFlow: vi.fn(),
  mockGradeQuizFlow: vi.fn(),
  mockCourses: [
    {
      id: "react-101",
      title: "React Fundamentals",
      description: "Learn React basics",
      learningObjectives:
        "1. Understand components 2. Use hooks 3. Manage state",
    },
    {
      id: "python-101",
      title: "Python Basics",
      description: "Learn Python",
      learningObjectives: "1. Variables 2. Functions 3. Classes",
    },
  ],
  mockLearningObjectives: [
    {
      id: "lo-1",
      courseId: "react-101",
      description: "Understand React components",
    },
    {
      id: "lo-2",
      courseId: "react-101",
      description: "Use React hooks effectively",
    },
    {
      id: "lo-3",
      courseId: "react-101",
      description: "Manage application state",
    },
  ],
}));

// ============================================================================
// MOCKS - Must be defined before imports
// ============================================================================

vi.mock("@/lib/firebase", () => ({
  db: { type: "mocked-firestore" },
}));

vi.mock("firebase/firestore", () => ({
  doc: (...args: any[]) => mockDoc(...args),
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  arrayUnion: (value: unknown) => mockArrayUnion(value),
  Timestamp: {
    now: () => mockTimestampNow(),
  },
}));

vi.mock("@/ai/flows/quiz-generation", () => ({
  generateQuizFlow: (...args: any[]) => mockGenerateQuizFlow(...args),
}));

vi.mock("@/ai/flows/quiz-grading", () => ({
  gradeQuizFlow: (...args: any[]) => mockGradeQuizFlow(...args),
}));

vi.mock("@/lib/mock-data", () => ({
  courses: mockCourses,
  learningObjectives: mockLearningObjectives,
}));

// ============================================================================
// IMPORTS - After mocks
// ============================================================================

import {
  generateQuiz,
  submitQuiz,
  saveQuizResult,
  updateLearningTrajectory,
  getQuiz,
  getStudentQuizzes,
} from "./quiz-service";

// ============================================================================
// TEST DATA
// ============================================================================

const TEST_USER_ID = "user-123";
const TEST_COURSE_ID = "react-101";
const TEST_QUIZ_ID = "quiz-abc123";

const mockGeneratedQuestions = [
  {
    text: "What is a React component?",
    type: "multiple_choice",
    options: ["A function", "A class", "Both A and B", "None"],
    correctAnswerIndex: 2,
    learningObjectiveIndex: 0,
    explanation: "React components can be functions or classes.",
  },
  {
    text: "Explain the useState hook.",
    type: "free_text",
    expectedAnswer:
      "useState is a hook for managing state in functional components.",
    gradingCriteria:
      "Should mention state management and functional components.",
    learningObjectiveIndex: 1,
    explanation: "useState allows state in function components.",
  },
];

const mockGradingResult = {
  score: 1,
  totalQuestions: 1,
  feedback: "Good job! You understand React basics.",
  loUpdates: [
    {
      loId: "lo-1",
      delta: 15,
      reasoning: "Correct answer on component question",
    },
    { loId: "lo-2", delta: 10, reasoning: "Good explanation of useState" },
  ],
  freeTextGrades: [
    { questionIndex: 1, score: 8, feedback: "Excellent explanation!" },
  ],
};

// ============================================================================
// TESTS
// ============================================================================

describe("Quiz Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    mockDoc.mockImplementation((_db, ...pathSegments) => ({
      path: pathSegments.join("/"),
      id: pathSegments[pathSegments.length - 1],
    }));

    mockCollection.mockImplementation((_db, ...pathSegments) => ({
      path: pathSegments.join("/"),
    }));

    mockQuery.mockImplementation((collectionRef) => ({
      ...collectionRef,
      _isQuery: true,
    }));

    mockWhere.mockImplementation((field, op, value) => ({
      field,
      op,
      value,
    }));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==========================================================================
  // generateQuiz Tests
  // ==========================================================================

  describe("generateQuiz", () => {
    it("should generate a quiz using mock data when course not in Firestore", async () => {
      // Course not found in Firestore
      mockGetDoc.mockResolvedValueOnce({ exists: () => false });

      // Mock LOs query returns empty (use mock data)
      mockGetDocs.mockResolvedValueOnce({ docs: [] });

      // Mock AI flow response
      mockGenerateQuizFlow.mockResolvedValueOnce({
        questions: mockGeneratedQuestions,
      });

      // Mock addDoc to return quiz ID
      mockAddDoc.mockResolvedValueOnce({ id: TEST_QUIZ_ID });

      const quizId = await generateQuiz(TEST_USER_ID, TEST_COURSE_ID);

      expect(quizId).toBe(TEST_QUIZ_ID);
      expect(mockGenerateQuizFlow).toHaveBeenCalledWith({
        courseTitle: "React Fundamentals",
        learningObjectives: expect.arrayContaining([
          "Understand React components",
          "Use React hooks effectively",
        ]),
        difficulty: "medium",
        count: 5,
      });
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: TEST_USER_ID,
          courseId: TEST_COURSE_ID,
          status: "pending",
          questions: mockGeneratedQuestions,
        })
      );
    });

    it("should generate a quiz using Firestore data when course exists", async () => {
      // Course found in Firestore
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ title: "Advanced React" }),
      });

      // Mock LOs from Firestore
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          { id: "fs-lo-1", data: () => ({ description: "Advanced hooks" }) },
          { id: "fs-lo-2", data: () => ({ description: "Context API" }) },
        ],
      });

      mockGenerateQuizFlow.mockResolvedValueOnce({
        questions: mockGeneratedQuestions,
      });

      mockAddDoc.mockResolvedValueOnce({ id: "quiz-firestore" });

      const quizId = await generateQuiz(TEST_USER_ID, TEST_COURSE_ID);

      expect(quizId).toBe("quiz-firestore");
      expect(mockGenerateQuizFlow).toHaveBeenCalledWith({
        courseTitle: "Advanced React",
        learningObjectives: ["Advanced hooks", "Context API"],
        difficulty: "medium",
        count: 5,
      });
    });

    it("should include custom prompt when provided", async () => {
      mockGetDoc.mockResolvedValueOnce({ exists: () => false });
      mockGetDocs.mockResolvedValueOnce({ docs: [] });
      mockGenerateQuizFlow.mockResolvedValueOnce({
        questions: mockGeneratedQuestions,
      });
      mockAddDoc.mockResolvedValueOnce({ id: TEST_QUIZ_ID });

      const customPrompt = "Focus on React hooks and state management";
      await generateQuiz(TEST_USER_ID, TEST_COURSE_ID, customPrompt);

      expect(mockGenerateQuizFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          customPrompt,
        })
      );
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          customPrompt,
          title: expect.stringContaining("Custom Quiz"),
        })
      );
    });

    it("should throw error when course not found", async () => {
      mockGetDoc.mockResolvedValueOnce({ exists: () => false });

      await expect(
        generateQuiz(TEST_USER_ID, "nonexistent-course")
      ).rejects.toThrow("Course not found");
    });
  });

  // ==========================================================================
  // submitQuiz Tests
  // ==========================================================================

  describe("submitQuiz", () => {
    const mockQuizData = {
      userId: TEST_USER_ID,
      courseId: TEST_COURSE_ID,
      questions: mockGeneratedQuestions,
      loIds: ["lo-1", "lo-2"],
      status: "pending",
    };

    it("should submit and grade a quiz successfully", async () => {
      // Mock quiz fetch
      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => mockQuizData,
        })
        // Mock skill doc checks for updateLearningTrajectory
        .mockResolvedValue({
          exists: () => true,
          data: () => ({ mastery: 50 }),
        });

      mockGradeQuizFlow.mockResolvedValueOnce(mockGradingResult);
      mockUpdateDoc.mockResolvedValue(undefined);
      mockSetDoc.mockResolvedValue(undefined);

      const studentAnswers = { 0: 2 };
      const studentTextAnswers = {
        1: "useState manages state in functional components.",
      };

      const result = await submitQuiz(
        TEST_USER_ID,
        TEST_QUIZ_ID,
        studentAnswers,
        studentTextAnswers
      );

      expect(result).toEqual(mockGradingResult);
      expect(mockGradeQuizFlow).toHaveBeenCalledWith({
        quizId: TEST_QUIZ_ID,
        questions: expect.arrayContaining([
          expect.objectContaining({
            type: "multiple_choice",
            studentAnswerIndex: 2,
          }),
          expect.objectContaining({
            type: "free_text",
            studentTextAnswer:
              "useState manages state in functional components.",
          }),
        ]),
      });

      // Verify quiz was updated
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: "completed",
          score: mockGradingResult.score,
          feedback: mockGradingResult.feedback,
        })
      );
    });

    it("should throw error when quiz not found", async () => {
      mockGetDoc.mockResolvedValueOnce({ exists: () => false });

      await expect(
        submitQuiz(TEST_USER_ID, TEST_QUIZ_ID, { 0: 1 })
      ).rejects.toThrow("Quiz not found");
    });

    it("should throw error for unauthorized access", async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ ...mockQuizData, userId: "different-user" }),
      });

      await expect(
        submitQuiz(TEST_USER_ID, TEST_QUIZ_ID, { 0: 1 })
      ).rejects.toThrow("Unauthorized access to quiz");
    });

    it("should handle missing student answers gracefully", async () => {
      mockGetDoc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => mockQuizData,
        })
        .mockResolvedValue({
          exists: () => false,
        });

      mockGradeQuizFlow.mockResolvedValueOnce(mockGradingResult);
      mockUpdateDoc.mockResolvedValue(undefined);
      mockSetDoc.mockResolvedValue(undefined);

      // Submit with no answers
      await submitQuiz(TEST_USER_ID, TEST_QUIZ_ID, {}, {});

      expect(mockGradeQuizFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          questions: expect.arrayContaining([
            expect.objectContaining({ studentAnswerIndex: -1 }),
            expect.objectContaining({ studentTextAnswer: "" }),
          ]),
        })
      );
    });
  });

  // ==========================================================================
  // saveQuizResult Tests
  // ==========================================================================

  describe("saveQuizResult", () => {
    it("should save quiz result to user profile", async () => {
      mockSetDoc.mockResolvedValueOnce(undefined);

      await saveQuizResult(TEST_USER_ID, TEST_QUIZ_ID, mockGradingResult);

      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        "users",
        TEST_USER_ID,
        "quizResults",
        TEST_QUIZ_ID
      );
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          score: mockGradingResult.score,
          totalQuestions: mockGradingResult.totalQuestions,
          feedback: mockGradingResult.feedback,
          loUpdates: mockGradingResult.loUpdates,
          freeTextGrades: mockGradingResult.freeTextGrades,
          status: "completed",
        })
      );
    });
  });

  // ==========================================================================
  // updateLearningTrajectory Tests
  // ==========================================================================

  describe("updateLearningTrajectory", () => {
    const loUpdates = [
      { loId: "lo-1", delta: 15, reasoning: "Correct answer" },
      { loId: "lo-2", delta: -5, reasoning: "Incorrect answer" },
    ];

    it("should update existing skill mastery", async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ mastery: 50 }),
      });
      mockUpdateDoc.mockResolvedValue(undefined);

      await updateLearningTrajectory(TEST_USER_ID, loUpdates);

      // Should update both skills
      expect(mockUpdateDoc).toHaveBeenCalledTimes(2);

      // First skill: 50 + 15 = 65
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          mastery: 65,
        })
      );
    });

    it("should create new skill entry if not exists", async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });
      mockSetDoc.mockResolvedValue(undefined);

      await updateLearningTrajectory(TEST_USER_ID, [
        { loId: "new-lo", delta: 20, reasoning: "New skill" },
      ]);

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          mastery: 20,
          history: expect.arrayContaining([
            expect.objectContaining({
              delta: 20,
              reasoning: "New skill",
            }),
          ]),
        })
      );
    });

    it("should clamp mastery between 0 and 100", async () => {
      // Test upper bound
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ mastery: 95 }),
      });
      mockUpdateDoc.mockResolvedValue(undefined);

      await updateLearningTrajectory(TEST_USER_ID, [
        { loId: "lo-1", delta: 15, reasoning: "Max cap" },
      ]);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          mastery: 100, // Should be capped at 100
        })
      );

      vi.clearAllMocks();

      // Test lower bound
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ mastery: 3 }),
      });
      mockUpdateDoc.mockResolvedValue(undefined);

      await updateLearningTrajectory(TEST_USER_ID, [
        { loId: "lo-1", delta: -10, reasoning: "Min cap" },
      ]);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          mastery: 0, // Should be capped at 0
        })
      );
    });
  });

  // ==========================================================================
  // getQuiz Tests
  // ==========================================================================

  describe("getQuiz", () => {
    it("should return quiz data with serialized timestamps", async () => {
      const mockDate = new Date("2026-01-16T12:00:00Z");
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: TEST_QUIZ_ID,
        data: () => ({
          userId: TEST_USER_ID,
          courseId: TEST_COURSE_ID,
          status: "completed",
          createdAt: { toDate: () => mockDate },
          completedAt: { toDate: () => mockDate },
        }),
      });

      const quiz = await getQuiz(TEST_QUIZ_ID);

      expect(quiz).toEqual({
        id: TEST_QUIZ_ID,
        userId: TEST_USER_ID,
        courseId: TEST_COURSE_ID,
        status: "completed",
        createdAt: "2026-01-16T12:00:00.000Z",
        completedAt: "2026-01-16T12:00:00.000Z",
      });
    });

    it("should return null when quiz not found", async () => {
      mockGetDoc.mockResolvedValueOnce({ exists: () => false });

      const quiz = await getQuiz("nonexistent-quiz");

      expect(quiz).toBeNull();
    });

    it("should handle null timestamps gracefully", async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: TEST_QUIZ_ID,
        data: () => ({
          userId: TEST_USER_ID,
          status: "pending",
          createdAt: null,
          completedAt: undefined,
        }),
      });

      const quiz = await getQuiz(TEST_QUIZ_ID);

      expect(quiz).toEqual({
        id: TEST_QUIZ_ID,
        userId: TEST_USER_ID,
        status: "pending",
        createdAt: null,
        completedAt: null,
      });
    });
  });

  // ==========================================================================
  // getStudentQuizzes Tests
  // ==========================================================================

  describe("getStudentQuizzes", () => {
    it("should return all quizzes for a student", async () => {
      const mockDate = new Date("2026-01-16T12:00:00Z");
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: "quiz-1",
            data: () => ({
              courseId: "react-101",
              status: "completed",
              score: 4,
              createdAt: { toDate: () => mockDate },
              completedAt: { toDate: () => mockDate },
            }),
          },
          {
            id: "quiz-2",
            data: () => ({
              courseId: "python-101",
              status: "pending",
              score: 0,
              createdAt: { toDate: () => mockDate },
              completedAt: null,
            }),
          },
        ],
      });

      const quizzes = await getStudentQuizzes(TEST_USER_ID);

      expect(quizzes).toHaveLength(2);
      expect(quizzes[0]).toEqual({
        id: "quiz-1",
        courseId: "react-101",
        status: "completed",
        score: 4,
        createdAt: "2026-01-16T12:00:00.000Z",
        completedAt: "2026-01-16T12:00:00.000Z",
      });
      expect(quizzes[1]).toEqual({
        id: "quiz-2",
        courseId: "python-101",
        status: "pending",
        score: 0,
        createdAt: "2026-01-16T12:00:00.000Z",
        completedAt: null,
      });
    });

    it("should return empty array when no quizzes found", async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] });

      const quizzes = await getStudentQuizzes(TEST_USER_ID);

      expect(quizzes).toEqual([]);
    });

    it("should query with correct user filter", async () => {
      mockGetDocs.mockResolvedValueOnce({ docs: [] });

      await getStudentQuizzes(TEST_USER_ID);

      expect(mockWhere).toHaveBeenCalledWith("userId", "==", TEST_USER_ID);
    });
  });
});
