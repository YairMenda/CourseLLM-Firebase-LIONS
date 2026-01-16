'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, ArrowRight, Award, RotateCw, ListChecks, PenLine } from 'lucide-react';
import { QuizGradingOutput } from '@/ai/flows/quiz-grading';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/AuthProviderClient';
import { submitQuiz, generateQuiz, getQuiz } from '@/services/quiz-service';

type Question = {
  text: string;
  type: 'multiple_choice' | 'free_text';
  // For multiple choice
  options?: string[];
  correctAnswerIndex?: number;
  // For free text
  expectedAnswer?: string;
  gradingCriteria?: string;
  // Common
  learningObjectiveIndex: number;
  explanation: string;
};

type QuizClientProps = {
  quizId: string;
  courseId: string;
  courseTitle: string;
};

export function QuizClient({ quizId, courseId, courseTitle }: QuizClientProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuizId, setCurrentQuizId] = useState<string>(quizId);
  const [activeCourseId, setActiveCourseId] = useState<string>(courseId);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({}); // For multiple choice
  const [textAnswers, setTextAnswers] = useState<Record<number, string>>({}); // For free text
  const [status, setStatus] = useState<'loading' | 'ready' | 'submitting' | 'results'>('loading');
  const [results, setResults] = useState<QuizGradingOutput | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const { firebaseUser } = useAuth();

  /**
   * Loads or generates a quiz via the QuizService.
   * This follows the microservices pattern - all data flows through the service layer.
   */
  const loadQuiz = async (isRetry = false) => {
    setStatus('loading');
    setAnswers({});
    setTextAnswers({});
    setCurrentQuestionIndex(0);
    setResults(null);
    
    if (!firebaseUser) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to take a quiz.",
      });
      return;
    }

    try {
      let quizData: any = null;
      
      // Try to fetch existing quiz first
      if (!isRetry && currentQuizId) {
        quizData = await getQuiz(currentQuizId);
      }
      
      // If no quiz exists or retry requested, generate a new one
      if (!quizData || isRetry) {
        const targetCourseId = activeCourseId || courseId;
        if (!targetCourseId) {
            throw new Error("Cannot generate quiz: Course ID missing");
        }
        const newQuizId = await generateQuiz(firebaseUser.uid, targetCourseId);
        setCurrentQuizId(newQuizId);
        quizData = await getQuiz(newQuizId);
      }
      
      if (!quizData || !quizData.questions) {
        throw new Error("Failed to load quiz data");
      }
      
      setQuestions(quizData.questions);
      if (quizData.courseId) setActiveCourseId(quizData.courseId);
      setStatus('ready');
      
      if (isRetry) {
        toast({
          title: "New Quiz Generated",
          description: "A fresh set of questions is ready for you.",
        });
      }
    } catch (error) {
      console.error("Failed to load quiz:", error);
      toast({
        variant: "destructive",
        title: "Error loading quiz",
        description: "Could not generate questions. Please try again.",
      });
    }
  };

  useEffect(() => {
    loadQuiz();
  }, [firebaseUser]); // Re-load when user auth state changes

  const handleOptionSelect = (optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [currentQuestionIndex]: optionIndex }));
  };

  const handleTextAnswerChange = (text: string) => {
    setTextAnswers(prev => ({ ...prev, [currentQuestionIndex]: text }));
  };

  const isCurrentQuestionAnswered = () => {
    const question = questions[currentQuestionIndex];
    if (!question) return false;
    
    if (question.type === 'free_text') {
      return (textAnswers[currentQuestionIndex]?.trim().length ?? 0) > 0;
    }
    return answers[currentQuestionIndex] !== undefined;
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  /**
   * Submits the quiz for grading via the QuizService.
   * The service handles: AI grading, result persistence, and learning trajectory updates.
   */
  const handleSubmit = () => {
    if (!firebaseUser) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to submit your quiz.",
      });
      return;
    }

    setStatus('submitting');
    startTransition(async () => {
      try {
        // Call QuizService - this is the microservices entry point
        const result = await submitQuiz(firebaseUser.uid, currentQuizId, answers, textAnswers);
        setResults(result);
        setStatus('results');
        
        toast({
          title: "Quiz Submitted!",
          description: "Your results have been saved to your profile.",
        });
        
      } catch (error) {
        console.error("Grading failed:", error);
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: "Could not grade your quiz. Please try again.",
        });
        setStatus('ready');
      }
    });
  };

  const handleRedo = () => {
    loadQuiz(true);
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full px-4 space-y-6 animate-in fade-in duration-500">
        <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
            <Loader2 className="h-16 w-16 animate-spin text-primary relative z-10" />
        </div>
        <div className="text-center space-y-2">
            <p className="text-xl font-semibold tracking-tight">Preparing Challenge</p>
            <p className="text-muted-foreground">Generating custom quiz for {courseTitle}...</p>
        </div>
      </div>
    );
  }

  if (status === 'results' && results) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-in zoom-in-95 duration-300 w-full px-4">
        <Card className="border-none shadow-2xl w-full max-w-3xl mx-auto overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 text-center border-b">
                <div className="mx-auto bg-background p-4 rounded-full w-fit mb-6 shadow-lg ring-4 ring-primary/10">
                  <Award className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">Quiz Complete!</h2>
                <p className="text-muted-foreground text-lg">
                  You scored <span className="font-bold text-primary">{results.score}</span> out of {results.totalQuestions}
                </p>
            </div>
          
          <CardContent className="p-8 space-y-8">
            <div className="bg-muted/30 p-6 rounded-xl border border-border/50">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span className="bg-primary/10 p-1 rounded text-primary">💡</span> 
                AI Feedback
              </h3>
              <p className="text-muted-foreground leading-relaxed">{results.feedback}</p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                 <span className="bg-primary/10 p-1 rounded text-primary">📈</span>
                 Learning Impact
              </h3>
              <div className="grid gap-3">
                  {results.loUpdates.map((update) => (
                    <div key={update.loId} className="flex items-center justify-between text-sm p-3 bg-background border rounded-lg shadow-sm">
                      <span className="font-medium text-muted-foreground">Mastery Update</span>
                      <div className={cn("flex items-center gap-1 font-bold px-2 py-1 rounded", 
                          update.delta >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      )}>
                        {update.delta > 0 ? <CheckCircle className="w-4 h-4"/> : <XCircle className="w-4 h-4"/>}
                        <span>{update.delta > 0 ? '+' : ''}{update.delta}%</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-8 pt-0 flex flex-col sm:flex-row justify-center gap-4">
            <Button onClick={() => router.push('/student/profile')} variant="outline" className="w-full sm:w-auto h-11">
              Back to Profile
            </Button>
            <Button onClick={handleRedo} variant="secondary" className="w-full sm:w-auto h-11">
              <RotateCw className="mr-2 h-4 w-4" />
              Try Another Quiz
            </Button>
            <Button onClick={() => router.push('/student/courses')} className="w-full sm:w-auto h-11 shadow-lg shadow-primary/20">
              Continue Learning
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-full max-w-3xl mx-auto space-y-8">
        <div className="space-y-4">
            <div className="flex justify-between text-sm font-medium text-muted-foreground">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2 w-full" />
        </div>

        <Card className="min-h-[450px] flex flex-col border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-muted/20 pb-6 pt-6 px-8 border-b">
              <div className="flex justify-center mb-3">
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1",
                    currentQuestion.type === 'free_text' 
                      ? "bg-purple-100 text-purple-700 border-purple-200" 
                      : "bg-blue-100 text-blue-700 border-blue-200"
                  )}
                >
                  {currentQuestion.type === 'free_text' ? (
                    <><PenLine className="h-3.5 w-3.5" /> Written Response</>
                  ) : (
                    <><ListChecks className="h-3.5 w-3.5" /> Multiple Choice</>
                  )}
                </Badge>
              </div>
              <CardTitle className="text-xl leading-relaxed font-semibold text-center">
                {currentQuestion.text}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-8">
              {currentQuestion.type === 'free_text' ? (
                // Free text question
                <div className="space-y-4">
                  <Textarea
                    key={currentQuestionIndex}
                    placeholder="Type your answer here..."
                    value={textAnswers[currentQuestionIndex] ?? ""}
                    onChange={(e) => handleTextAnswerChange(e.target.value)}
                    className="min-h-[200px] resize-none text-base leading-relaxed"
                  />
                  <p className="text-sm text-muted-foreground">
                    Write a complete answer. Your response will be evaluated by AI for accuracy and completeness.
                  </p>
                </div>
              ) : (
                // Multiple choice question
                <RadioGroup
                  key={currentQuestionIndex}
                  value={answers[currentQuestionIndex]?.toString() ?? ""}
                  onValueChange={(val) => handleOptionSelect(parseInt(val))}
                  className="space-y-4"
                >
                  {currentQuestion.options?.map((option, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => handleOptionSelect(idx)}
                      className={cn(
                        "flex items-center space-x-3 border-2 rounded-xl p-4 cursor-pointer transition-all duration-200",
                        answers[currentQuestionIndex] === idx 
                          ? "border-primary bg-primary/5 shadow-md scale-[1.01]" 
                          : "border-transparent bg-muted/30 hover:bg-muted/50 hover:border-muted-foreground/20"
                      )}
                    >
                      <RadioGroupItem value={idx.toString()} id={`opt-${idx}`} className="sr-only" />
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0",
                        answers[currentQuestionIndex] === idx ? "border-primary" : "border-muted-foreground/30"
                      )}>
                        {answers[currentQuestionIndex] === idx && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <Label htmlFor={`opt-${idx}`} className="flex-1 cursor-pointer font-medium text-base">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </CardContent>
            <CardFooter className="flex justify-between p-8 bg-muted/10 border-t">
              <Button
                variant="ghost"
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0 || status === 'submitting'}
                className="text-muted-foreground hover:text-foreground"
              >
                Previous
              </Button>
              <Button 
                onClick={handleNext}
                disabled={!isCurrentQuestionAnswered() || status === 'submitting'}
                className="px-8 h-11 shadow-lg shadow-primary/20 text-base"
              >
                {currentQuestionIndex === questions.length - 1 ? (
                  status === 'submitting' ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : 'Submit Quiz'
                ) : (
                  <>Next Question <ArrowRight className="ml-2 h-5 w-5" /></>
                )}
              </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
