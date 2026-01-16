"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Play,
  Trophy,
  Clock,
  BookOpen,
  CheckCircle2,
  XCircle,
  Sparkles,
  GraduationCap,
  ArrowRight,
  Eye,
  Wand2,
  PenLine,
} from "lucide-react";
import { courses, quizzes as mockQuizzes } from "@/lib/mock-data";
import { useAuth } from "@/components/AuthProviderClient";
import { generateQuiz, getStudentQuizzes } from "@/services/quiz-service";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getPlaceholderImage } from "@/lib/placeholder-images";

type QuizQuestion = {
  text: string;
  type?: "multiple_choice" | "free_text";
  // For multiple choice
  options?: string[];
  correctAnswerIndex?: number;
  // For free text
  expectedAnswer?: string;
  gradingCriteria?: string;
  // Common
  explanation?: string;
};

type FreeTextGrade = {
  questionIndex: number;
  score: number;
  feedback: string;
};

type QuizResult = {
  id: string;
  title?: string;
  courseId: string;
  score: number;
  totalQuestions: number;
  status: string;
  completedAt?: string | null;
  createdAt?: string | null;
  questions?: QuizQuestion[];
  studentAnswers?: Record<number, number>;
  studentTextAnswers?: Record<number, string>;
  freeTextGrades?: FreeTextGrade[];
  feedback?: string;
};

type QuizMode = "ai-only" | "custom-prompt";

export function AssessmentClient() {
  const [isPending, startTransition] = useTransition();
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizResult | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  // Quiz mode selection state
  const [isModeDialogOpen, setIsModeDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [quizMode, setQuizMode] = useState<QuizMode>("ai-only");
  const [customPrompt, setCustomPrompt] = useState("");
  const router = useRouter();
  const { toast } = useToast();
  const { firebaseUser } = useAuth();

  const handleViewQuiz = (quiz: QuizResult) => {
    if (quiz.status === "completed" && quiz.questions) {
      setSelectedQuiz(quiz);
      setIsReviewOpen(true);
    } else {
      toast({
        title: "Quiz not available for review",
        description: "Only completed quizzes can be reviewed.",
      });
    }
  };

  // Load quiz history from Firestore
  useEffect(() => {
    async function loadQuizHistory() {
      if (!firebaseUser) {
        setLoadingHistory(false);
        return;
      }

      try {
        const quizzes = await getStudentQuizzes(firebaseUser.uid);
        setQuizHistory(quizzes as QuizResult[]);
      } catch (error) {
        console.error("Failed to load quiz history:", error);
        // Fall back to mock data for demo
        setQuizHistory(
          mockQuizzes.filter(
            (q) => q.status === "completed"
          ) as unknown as QuizResult[]
        );
      } finally {
        setLoadingHistory(false);
      }
    }

    loadQuizHistory();
  }, [firebaseUser]);

  const handleTakeQuiz = (courseId: string) => {
    if (!firebaseUser) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to take a quiz.",
      });
      return;
    }

    // Open the mode selection dialog
    setSelectedCourseId(courseId);
    setQuizMode("ai-only");
    setCustomPrompt("");
    setIsModeDialogOpen(true);
  };

  const handleGenerateQuiz = () => {
    if (!firebaseUser || !selectedCourseId) return;

    setIsModeDialogOpen(false);
    setGeneratingFor(selectedCourseId);

    startTransition(async () => {
      try {
        // Generate a new quiz using the quiz service (with optional custom prompt)
        const promptToUse =
          quizMode === "custom-prompt" && customPrompt.trim()
            ? customPrompt.trim()
            : undefined;
        const quizId = await generateQuiz(
          firebaseUser.uid,
          selectedCourseId,
          promptToUse
        );

        toast({
          title: "Quiz Ready!",
          description: promptToUse
            ? "Your custom quiz has been generated based on your request."
            : "Your personalized quiz has been generated.",
        });

        // Navigate to the quiz page
        router.push(`/student/assessments/${quizId}`);
      } catch (error) {
        console.error("Failed to generate quiz:", error);
        toast({
          variant: "destructive",
          title: "Failed to Generate Quiz",
          description:
            error instanceof Error ? error.message : "Please try again later.",
        });
        setGeneratingFor(null);
      }
    });
  };

  const getCourseTitle = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    return course?.title || "Unknown Course";
  };

  const completedQuizzes = quizHistory.filter((q) => q.status === "completed");
  const averageScore =
    completedQuizzes.length > 0
      ? Math.round(
          completedQuizzes.reduce(
            (acc, q) => acc + (q.score / q.totalQuestions) * 100,
            0
          ) / completedQuizzes.length
        )
      : 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-3">
          <GraduationCap className="h-8 w-8 text-primary" />
          Quizzes & Assessments
        </h1>
        <p className="text-muted-foreground text-lg">
          Test your knowledge and track your learning progress
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-xl">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Quizzes Completed
                </p>
                <p className="text-2xl font-bold">{completedQuizzes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-2xl font-bold">{averageScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Courses Available
                </p>
                <p className="text-2xl font-bold">{courses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="take-quiz" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto">
          <TabsTrigger value="take-quiz" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Take a Quiz
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Quiz History
          </TabsTrigger>
        </TabsList>

        {/* Take a Quiz Tab */}
        <TabsContent value="take-quiz" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
            <div>
              <h2 className="text-xl font-semibold">Available Courses</h2>
              <p className="text-muted-foreground">
                Select a course to generate an AI-powered quiz
              </p>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              AI-Generated
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 justify-items-center mx-auto max-w-5xl">
            {courses.map((course) => {
              const isGenerating = generatingFor === course.id;
              const courseQuizzes = quizHistory.filter(
                (q) => q.courseId === course.id
              );
              const lastQuiz = courseQuizzes[courseQuizzes.length - 1];

              return (
                <Card
                  key={course.id}
                  className={cn(
                    "overflow-hidden transition-all duration-300 hover:shadow-lg group",
                    isGenerating && "ring-2 ring-primary"
                  )}
                >
                  <div className="relative h-32 overflow-hidden">
                    <img
                      src={
                        getPlaceholderImage(course.imageId)?.imageUrl ||
                        "/placeholder.jpg"
                      }
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="font-semibold text-white text-lg leading-tight">
                        {course.title}
                      </h3>
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {course.description}
                    </p>

                    {lastQuiz && lastQuiz.status === "completed" && (
                      <div className="flex items-center gap-2 text-sm">
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Last:{" "}
                          {Math.round(
                            (lastQuiz.score / lastQuiz.totalQuestions) * 100
                          )}
                          %
                        </Badge>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="p-4 pt-0">
                    <Button
                      className="w-full group/btn"
                      onClick={() => handleTakeQuiz(course.id)}
                      disabled={isPending}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Quiz...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Take Quiz
                          <ArrowRight className="ml-2 h-4 w-4 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Quiz History Tab */}
        <TabsContent value="history" className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Your Quiz History</h2>
            <p className="text-muted-foreground">
              Review your past quiz attempts and scores
            </p>
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : quizHistory.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-muted rounded-full mb-4">
                  <Trophy className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  No quizzes taken yet
                </h3>
                <p className="text-muted-foreground mb-4 max-w-sm">
                  Take your first quiz to start tracking your learning progress!
                </p>
                <Button
                  variant="outline"
                  onClick={() =>
                    document
                      .querySelector('[value="take-quiz"]')
                      ?.dispatchEvent(new Event("click"))
                  }
                >
                  Browse Available Quizzes
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-w-3xl mx-auto">
              {quizHistory.map((quiz) => {
                const scorePercent = Math.round(
                  (quiz.score / quiz.totalQuestions) * 100
                );
                const isPassing = scorePercent >= 70;

                return (
                  <Card
                    key={quiz.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              "p-3 rounded-xl",
                              isPassing ? "bg-green-100" : "bg-amber-100"
                            )}
                          >
                            {isPassing ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-amber-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium">
                              {quiz.title || getCourseTitle(quiz.courseId)}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {quiz.completedAt
                                ? new Date(
                                    quiz.completedAt
                                  ).toLocaleDateString()
                                : "Recently"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p
                              className={cn(
                                "text-2xl font-bold",
                                isPassing ? "text-green-600" : "text-amber-600"
                              )}
                            >
                              {scorePercent}%
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {quiz.score}/{quiz.totalQuestions} correct
                            </p>
                          </div>

                          <div className="flex gap-2">
                            {quiz.questions && quiz.status === "completed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewQuiz(quiz)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Review
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTakeQuiz(quiz.courseId)}
                            >
                              Retry
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Quiz Mode Selection Dialog */}
      <Dialog open={isModeDialogOpen} onOpenChange={setIsModeDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Generate Quiz
            </DialogTitle>
            <DialogDescription>
              Choose how you want your quiz to be generated for{" "}
              <span className="font-medium text-foreground">
                {selectedCourseId && getCourseTitle(selectedCourseId)}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* AI-Only Option */}
            <div
              onClick={() => setQuizMode("ai-only")}
              className={cn(
                "relative flex items-start gap-4 rounded-lg border-2 p-4 cursor-pointer transition-all hover:bg-accent/50",
                quizMode === "ai-only"
                  ? "border-primary bg-primary/5"
                  : "border-border"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  quizMode === "ai-only"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <Wand2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="font-medium leading-none">AI-Generated Quiz</p>
                <p className="text-sm text-muted-foreground">
                  Let AI create questions based on the course learning
                  objectives automatically
                </p>
              </div>
              {quizMode === "ai-only" && (
                <CheckCircle2 className="absolute right-4 top-4 h-5 w-5 text-primary" />
              )}
            </div>

            {/* Custom Prompt Option */}
            <div
              onClick={() => setQuizMode("custom-prompt")}
              className={cn(
                "relative flex items-start gap-4 rounded-lg border-2 p-4 cursor-pointer transition-all hover:bg-accent/50",
                quizMode === "custom-prompt"
                  ? "border-primary bg-primary/5"
                  : "border-border"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  quizMode === "custom-prompt"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <PenLine className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="font-medium leading-none">Custom Focus Quiz</p>
                <p className="text-sm text-muted-foreground">
                  Specify topics, concepts, or content you want to be tested on
                </p>
              </div>
              {quizMode === "custom-prompt" && (
                <CheckCircle2 className="absolute right-4 top-4 h-5 w-5 text-primary" />
              )}
            </div>

            {/* Custom Prompt Textarea */}
            {quizMode === "custom-prompt" && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                <Label htmlFor="custom-prompt" className="text-sm font-medium">
                  What would you like to be quizzed on?
                </Label>
                <Textarea
                  id="custom-prompt"
                  placeholder="e.g., Focus on React hooks, especially useState and useEffect. Include questions about common pitfalls and best practices..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Be as specific as possible for better targeted questions
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsModeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateQuiz}
              disabled={quizMode === "custom-prompt" && !customPrompt.trim()}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Quiz
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quiz Review Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/30">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <BookOpen className="h-5 w-5 text-primary" />
              {selectedQuiz?.title || "Quiz Review"}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-4 mt-2">
              <span>
                Score:{" "}
                <span className="font-semibold text-foreground">
                  {selectedQuiz?.score}/{selectedQuiz?.totalQuestions}
                </span>
              </span>
              {selectedQuiz?.completedAt && (
                <span>
                  Completed:{" "}
                  {new Date(selectedQuiz.completedAt).toLocaleDateString()}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(85vh-140px)]">
            <div className="p-6 space-y-6">
              {/* AI Feedback */}
              {selectedQuiz?.feedback && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <h4 className="font-medium text-sm text-primary mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI Feedback
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedQuiz.feedback}
                  </p>
                </div>
              )}

              {/* Questions Review */}
              <div className="space-y-4">
                {selectedQuiz?.questions?.map((question, qIndex) => {
                  const isFreeText = question.type === "free_text";
                  const studentAnswer =
                    selectedQuiz.studentAnswers?.[qIndex] ?? -1;
                  const studentTextAnswer =
                    selectedQuiz.studentTextAnswers?.[qIndex] ?? "";
                  // For multiple choice, check if answer matches
                  // For free text, we can't easily determine correctness from client
                  const isCorrect = isFreeText
                    ? undefined // We don't know - AI graded it
                    : studentAnswer === question.correctAnswerIndex;

                  return (
                    <Card
                      key={qIndex}
                      className={cn(
                        "overflow-hidden",
                        isFreeText
                          ? "border-purple-200 bg-purple-50/30"
                          : isCorrect
                          ? "border-green-200 bg-green-50/30"
                          : "border-red-200 bg-red-50/30"
                      )}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium",
                                isFreeText
                                  ? "bg-purple-100 text-purple-700"
                                  : isCorrect
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              )}
                            >
                              {qIndex + 1}
                            </div>
                            <div className="space-y-1">
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-xs",
                                  isFreeText
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-blue-100 text-blue-700"
                                )}
                              >
                                {isFreeText ? (
                                  <>
                                    <PenLine className="h-3 w-3 mr-1" /> Written
                                    Response
                                  </>
                                ) : (
                                  "Multiple Choice"
                                )}
                              </Badge>
                              <p className="font-medium text-sm leading-relaxed">
                                {question.text}
                              </p>
                            </div>
                          </div>
                          {!isFreeText &&
                            (isCorrect ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                            ))}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 pb-4">
                        {isFreeText ? (
                          // Free text question review
                          (() => {
                            const freeTextGrade =
                              selectedQuiz?.freeTextGrades?.find(
                                (g) => g.questionIndex === qIndex
                              );
                            const gradeScore = freeTextGrade?.score ?? 0;
                            const gradeColor =
                              gradeScore >= 8
                                ? "text-green-600 bg-green-100 border-green-300"
                                : gradeScore >= 5
                                ? "text-amber-600 bg-amber-100 border-amber-300"
                                : "text-red-600 bg-red-100 border-red-300";

                            return (
                              <div className="space-y-3 pl-10">
                                {/* Grade Display */}
                                {freeTextGrade && (
                                  <div
                                    className={cn(
                                      "flex items-center justify-between p-3 rounded-lg border",
                                      gradeColor
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="text-2xl font-bold">
                                        {freeTextGrade.score}/10
                                      </div>
                                      <span className="text-sm font-medium">
                                        {gradeScore >= 8
                                          ? "Excellent!"
                                          : gradeScore >= 5
                                          ? "Good effort"
                                          : "Needs improvement"}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* AI Feedback for this answer */}
                                {freeTextGrade?.feedback && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-primary uppercase tracking-wide flex items-center gap-1">
                                      <Sparkles className="h-3 w-3" />
                                      AI Feedback
                                    </p>
                                    <div className="bg-primary/5 border border-primary/20 p-3 rounded-md text-sm text-muted-foreground">
                                      {freeTextGrade.feedback}
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Your Answer
                                  </p>
                                  <div className="bg-muted/50 p-3 rounded-md text-sm">
                                    {studentTextAnswer || (
                                      <span className="text-muted-foreground italic">
                                        No answer provided
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {question.expectedAnswer && (
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-green-700 uppercase tracking-wide">
                                      Expected Answer
                                    </p>
                                    <div className="bg-green-50 border border-green-200 p-3 rounded-md text-sm">
                                      {question.expectedAnswer}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          // Multiple choice question review
                          <div className="space-y-2 pl-10">
                            {question.options?.map((option, oIndex) => {
                              const isStudentChoice = studentAnswer === oIndex;
                              const isCorrectAnswer =
                                question.correctAnswerIndex === oIndex;

                              return (
                                <div
                                  key={oIndex}
                                  className={cn(
                                    "flex items-center gap-3 p-2.5 rounded-md text-sm transition-colors",
                                    isCorrectAnswer &&
                                      "bg-green-100 border border-green-300",
                                    isStudentChoice &&
                                      !isCorrectAnswer &&
                                      "bg-red-100 border border-red-300",
                                    !isStudentChoice &&
                                      !isCorrectAnswer &&
                                      "bg-muted/50"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                      isCorrectAnswer
                                        ? "border-green-600 bg-green-600"
                                        : isStudentChoice
                                        ? "border-red-600 bg-red-600"
                                        : "border-muted-foreground/30"
                                    )}
                                  >
                                    {(isCorrectAnswer || isStudentChoice) && (
                                      <div className="w-2 h-2 rounded-full bg-white" />
                                    )}
                                  </div>
                                  <span
                                    className={cn(
                                      "flex-1",
                                      isCorrectAnswer && "font-medium",
                                      isStudentChoice &&
                                        !isCorrectAnswer &&
                                        "line-through opacity-75"
                                    )}
                                  >
                                    {option}
                                  </span>
                                  {isCorrectAnswer && (
                                    <Badge
                                      variant="secondary"
                                      className="bg-green-200 text-green-800 text-xs"
                                    >
                                      Correct
                                    </Badge>
                                  )}
                                  {isStudentChoice && !isCorrectAnswer && (
                                    <Badge
                                      variant="secondary"
                                      className="bg-red-200 text-red-800 text-xs"
                                    >
                                      Your Answer
                                    </Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Explanation */}
                        {question.explanation && (
                          <div className="mt-3 pl-10 pt-3 border-t border-dashed">
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Explanation:</span>{" "}
                              {question.explanation}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
