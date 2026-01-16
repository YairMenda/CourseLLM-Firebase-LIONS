'use server';

/**
 * Quiz Service - Microservice for Quiz Operations
 * 
 * This service handles:
 * - Quiz generation (via AI flow)
 * - Quiz submission and grading (via AI flow)
 * - Result persistence to Firestore
 * - Learning trajectory updates
 * 
 * All methods are server actions that can be called directly from client components.
 * Data flows through Firestore (emulator in development).
 */

import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, updateDoc, arrayUnion, collection, Timestamp, query, where, getDocs, addDoc } from "firebase/firestore";
import { generateQuizFlow, QuizGenerationInput } from "@/ai/flows/quiz-generation";
import { gradeQuizFlow, QuizGradingInput, QuizGradingOutput } from "@/ai/flows/quiz-grading";
import { courses as mockCourses, learningObjectives as mockLOs } from "@/lib/mock-data";

/**
 * Generates a new quiz for a student based on a course.
 * Persists the generated quiz and returns the quiz ID.
 * @param customPrompt - Optional custom user prompt for specific topics to focus on
 */
export async function generateQuiz(userId: string, courseId: string, customPrompt?: string): Promise<string> {
  // 1. Fetch Course Details (Title) and Learning Objectives
  // Try Firestore first, fall back to mock data for development
  let courseTitle: string;
  let learningObjectives: string[];
  let loIds: string[];

  const courseRef = doc(db, "courses", courseId);
  const courseSnap = await getDoc(courseRef);
  
  if (courseSnap.exists()) {
    const courseData = courseSnap.data();
    courseTitle = courseData.title;
    
    // Fetch LOs from Firestore
    const loQuery = query(collection(db, "learningObjectives"), where("courseId", "==", courseId));
    const loSnap = await getDocs(loQuery);
    learningObjectives = loSnap.docs.map(d => d.data().description);
    loIds = loSnap.docs.map(d => d.id);
  } else {
    // Fall back to mock data for development
    const mockCourse = mockCourses.find(c => c.id === courseId);
    if (!mockCourse) {
      throw new Error("Course not found");
    }
    courseTitle = mockCourse.title;
    
    // Parse learning objectives from course string or use mock LOs
    const courseLOs = mockLOs.filter(lo => lo.courseId === courseId);
    learningObjectives = courseLOs.length > 0 
      ? courseLOs.map(lo => lo.description)
      : mockCourse.learningObjectives.split(/\d+\.\s*/).filter(Boolean);
    loIds = courseLOs.map(lo => lo.id);
  }

  // 2. Call AI Flow to Generate Quiz
  const input: QuizGenerationInput = {
      courseTitle: courseTitle,
      learningObjectives: learningObjectives,
      difficulty: 'medium',
      count: 5,
      ...(customPrompt && { customPrompt }),
  };
  
  const generatedQuiz = await generateQuizFlow(input);

  // 3. Save Generated Quiz to Firestore
  const quizData = {
      userId,
      courseId,
      title: customPrompt ? `Custom Quiz: ${courseTitle}` : `Practice: ${courseTitle}`,
      questions: generatedQuiz.questions,
      loIds: loIds,
      status: 'pending',
      createdAt: Timestamp.now(),
      totalQuestions: generatedQuiz.questions.length,
      score: 0,
      ...(customPrompt && { customPrompt }),
  };

  const quizRef = await addDoc(collection(db, "quizzes"), quizData);
  return quizRef.id;
}

/**
 * Submits a quiz for grading.
 * Calls the grading AI, saves the results, and updates user mastery.
 * @param studentAnswers - Multiple choice answers (question index -> option index)
 * @param studentTextAnswers - Free text answers (question index -> text response)
 */
export async function submitQuiz(
    userId: string, 
    quizId: string, 
    studentAnswers: Record<number, number>,
    studentTextAnswers: Record<number, string> = {}
): Promise<QuizGradingOutput> {
    // 1. Fetch the quiz from DB
    const quizRef = doc(db, "quizzes", quizId);
    const quizSnap = await getDoc(quizRef);
    
    if (!quizSnap.exists()) {
        throw new Error("Quiz not found");
    }
    
    const quizData = quizSnap.data();
    
    if (quizData.userId !== userId) {
        throw new Error("Unauthorized access to quiz");
    }

    // 2. Prepare input for Grading Flow (handles both question types)
    const gradingInput: QuizGradingInput = {
        quizId,
        questions: quizData.questions.map((q: any, index: number) => {
            const baseQuestion = {
                questionId: `q-${index}`,
                text: q.text,
                type: q.type || 'multiple_choice',
                learningObjectiveId: quizData.loIds[q.learningObjectiveIndex]
            };

            if (q.type === 'free_text') {
                return {
                    ...baseQuestion,
                    expectedAnswer: q.expectedAnswer,
                    gradingCriteria: q.gradingCriteria,
                    studentTextAnswer: studentTextAnswers[index] ?? '',
                };
            } else {
                return {
                    ...baseQuestion,
                    correctAnswerIndex: q.correctAnswerIndex,
                    studentAnswerIndex: studentAnswers[index] ?? -1,
                };
            }
        })
    };

    // 3. Call Grading Flow
    const result = await gradeQuizFlow(gradingInput);

    // 4. Update Quiz with Results (including both answer types for review)
    await updateDoc(quizRef, {
        status: 'completed',
        score: result.score,
        feedback: result.feedback,
        loUpdates: result.loUpdates,
        freeTextGrades: result.freeTextGrades || [],
        studentAnswers: studentAnswers,
        studentTextAnswers: studentTextAnswers,
        completedAt: Timestamp.now()
    });

    // 5. Save Result to User Profile
    await saveQuizResult(userId, quizId, result);

    // 6. Update Learning Trajectory
    await updateLearningTrajectory(userId, result.loUpdates);

    return result;
}

/**
 * Saves the result of a quiz to the user's profile (subcollection).
 */
export async function saveQuizResult(userId: string, quizId: string, result: QuizGradingOutput) {
  const resultRef = doc(db, "users", userId, "quizResults", quizId);
  
  await setDoc(resultRef, {
    score: result.score,
    totalQuestions: result.totalQuestions,
    feedback: result.feedback,
    loUpdates: result.loUpdates,
    freeTextGrades: result.freeTextGrades || [],
    dateTaken: Timestamp.now(),
    status: 'completed'
  });
}

/**
 * Updates the student's mastery of Learning Objectives.
 */
export async function updateLearningTrajectory(userId: string, loUpdates: { loId: string; delta: number; reasoning: string }[]) {
  const batchPromises = loUpdates.map(async (update) => {
    const skillRef = doc(db, "users", userId, "skills", update.loId);
    const skillDoc = await getDoc(skillRef);

    if (skillDoc.exists()) {
      const currentMastery = skillDoc.data().mastery || 0;
      const newMastery = Math.max(0, Math.min(100, currentMastery + update.delta));
      
      await updateDoc(skillRef, {
          mastery: newMastery,
          history: arrayUnion({
              delta: update.delta,
              reasoning: update.reasoning,
              date: Timestamp.now()
          }),
          lastUpdated: Timestamp.now()
      });
    } else {
      // Create new skill entry
      await setDoc(skillRef, {
          mastery: Math.max(0, update.delta),
          history: [{
              delta: update.delta,
              reasoning: update.reasoning,
              date: Timestamp.now()
          }],
          lastUpdated: Timestamp.now()
      });
    }
  });

  await Promise.all(batchPromises);
}

/**
 * Fetches a quiz by ID.
 * Serializes Firestore Timestamps to ISO strings for client component compatibility.
 */
export async function getQuiz(quizId: string) {
  const quizRef = doc(db, "quizzes", quizId);
  const snapshot = await getDoc(quizRef);
  
  if (snapshot.exists()) {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      // Convert Timestamps to ISO strings for client component serialization
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      completedAt: data.completedAt?.toDate?.()?.toISOString() ?? null,
    };
  }
  return null;
}

/**
 * Fetches all quizzes taken by a student.
 * Serializes Firestore Timestamps to ISO strings for client component compatibility.
 */
export async function getStudentQuizzes(userId: string) {
    const q = query(collection(db, "quizzes"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            // Convert Timestamps to ISO strings for client component serialization
            createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
            completedAt: data.completedAt?.toDate?.()?.toISOString() ?? null,
        };
    });
}
