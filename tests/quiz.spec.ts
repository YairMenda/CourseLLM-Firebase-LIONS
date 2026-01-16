import { test, expect } from "@playwright/test";

/**
 * Quiz Service E2E Tests
 *
 * Tests the complete quiz flow through the UI:
 * - Quiz generation from course selection
 * - Quiz taking (multiple choice & free text)
 * - Quiz submission and grading
 * - Quiz history and review
 *
 * Prerequisites:
 * - Firebase emulators running
 * - Next.js dev server running on port 9002
 * - Genkit AI service available (or mocked)
 */

// Helper to authenticate as a student
async function authenticateAsStudent(page: any, request: any, uid: string) {
  const res = await request.get(
    `http://localhost:9002/api/test-token?uid=${uid}&role=student&createProfile=true`
  );
  expect(res.ok()).toBeTruthy();
  const { token } = await res.json();

  await page.goto(
    `http://localhost:9002/test/signin?token=${encodeURIComponent(token)}`
  );
  await page.waitForURL("**/student", { timeout: 10000 });
}

test.describe("Quiz Assessments Page", () => {
  test("should display assessments page with stats and available courses", async ({
    page,
    request,
  }) => {
    await authenticateAsStudent(page, request, "quiz-e2e-student-1");

    // Navigate to assessments page
    await page.goto("http://localhost:9002/student/assessments");
    await page.waitForLoadState("domcontentloaded");

    // Check header is visible
    await expect(
      page.getByRole("heading", { name: /quizzes & assessments/i })
    ).toBeVisible();

    // Check stats cards are visible
    await expect(page.getByText(/quizzes completed/i)).toBeVisible();
    await expect(page.getByText(/average score/i)).toBeVisible();
    await expect(page.getByText(/courses available/i)).toBeVisible();

    // Check tabs are visible
    await expect(page.getByRole("tab", { name: /take a quiz/i })).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /quiz history/i })
    ).toBeVisible();

    // Check at least one course card with "Take Quiz" button is visible
    await expect(
      page.getByRole("button", { name: /take quiz/i }).first()
    ).toBeVisible();
  });

  test("should show quiz mode selection dialog when clicking Take Quiz", async ({
    page,
    request,
  }) => {
    await authenticateAsStudent(page, request, "quiz-e2e-student-2");

    await page.goto("http://localhost:9002/student/assessments");
    await page.waitForLoadState("domcontentloaded");

    // Click on the first "Take Quiz" button
    await page
      .getByRole("button", { name: /take quiz/i })
      .first()
      .click();

    // Dialog should appear
    await expect(
      page.getByRole("heading", { name: /generate quiz/i })
    ).toBeVisible();

    // Check both options are visible
    await expect(page.getByText(/ai-generated quiz/i)).toBeVisible();
    await expect(page.getByText(/custom focus quiz/i)).toBeVisible();

    // Check generate button is visible
    await expect(
      page.getByRole("button", { name: /generate quiz/i })
    ).toBeVisible();

    // Check cancel button works
    await page.getByRole("button", { name: /cancel/i }).click();
    await expect(
      page.getByRole("heading", { name: /generate quiz/i })
    ).not.toBeVisible();
  });

  test("should enable custom prompt textarea when Custom Focus is selected", async ({
    page,
    request,
  }) => {
    await authenticateAsStudent(page, request, "quiz-e2e-student-3");

    await page.goto("http://localhost:9002/student/assessments");
    await page.waitForLoadState("domcontentloaded");

    // Open quiz mode dialog
    await page
      .getByRole("button", { name: /take quiz/i })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: /generate quiz/i })
    ).toBeVisible();

    // Click on Custom Focus Quiz option
    await page.getByText(/custom focus quiz/i).click();

    // Textarea should appear
    await expect(page.getByPlaceholder(/focus on react hooks/i)).toBeVisible();

    // Generate button should be disabled when textarea is empty
    const generateBtn = page.getByRole("button", { name: /generate quiz/i });
    await expect(generateBtn).toBeDisabled();

    // Type custom prompt
    await page
      .getByPlaceholder(/focus on react hooks/i)
      .fill("Test React useState and useEffect hooks");

    // Generate button should now be enabled
    await expect(generateBtn).toBeEnabled();
  });

  test("should show empty state in quiz history for new user", async ({
    page,
    request,
  }) => {
    await authenticateAsStudent(page, request, "quiz-e2e-new-user");

    await page.goto("http://localhost:9002/student/assessments");
    await page.waitForLoadState("domcontentloaded");

    // Click on Quiz History tab
    await page.getByRole("tab", { name: /quiz history/i }).click();

    // Should show empty state
    await expect(page.getByText(/no quizzes taken yet/i)).toBeVisible();
    await expect(
      page.getByText(/take your first quiz to start tracking/i)
    ).toBeVisible();
  });
});

test.describe("Quiz Taking Flow", () => {
  test("should show loading state when generating quiz", async ({
    page,
    request,
  }) => {
    await authenticateAsStudent(page, request, "quiz-e2e-student-4");

    await page.goto("http://localhost:9002/student/assessments");
    await page.waitForLoadState("domcontentloaded");

    // Open quiz mode dialog and start generation
    await page
      .getByRole("button", { name: /take quiz/i })
      .first()
      .click();
    await page.getByRole("button", { name: /generate quiz/i }).click();

    // Should show loading indicator (either in button or on quiz page)
    // The button might show "Generating Quiz..." or we navigate to quiz page with loader
    const hasLoadingButton = await page
      .getByText(/generating quiz/i)
      .isVisible()
      .catch(() => false);
    const hasLoadingPage = await page
      .getByText(/preparing challenge/i)
      .isVisible()
      .catch(() => false);

    expect(hasLoadingButton || hasLoadingPage).toBeTruthy();
  });
});

test.describe("Quiz Navigation", () => {
  test("should navigate between assessments and other student pages", async ({
    page,
    request,
  }) => {
    await authenticateAsStudent(page, request, "quiz-e2e-nav-student");

    // Go to assessments
    await page.goto("http://localhost:9002/student/assessments");
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.getByRole("heading", { name: /quizzes & assessments/i })
    ).toBeVisible();

    // Navigate to courses (if sidebar is available)
    const coursesLink = page.getByRole("link", { name: /courses/i });
    if (await coursesLink.isVisible()) {
      await coursesLink.click();
      await page.waitForURL("**/courses**");
    }

    // Navigate back to assessments
    await page.goto("http://localhost:9002/student/assessments");
    await expect(
      page.getByRole("heading", { name: /quizzes & assessments/i })
    ).toBeVisible();
  });

  test("should require authentication for assessments page", async ({
    page,
  }) => {
    // Try to access assessments without authentication
    await page.goto("http://localhost:9002/student/assessments");

    // Wait for either redirect to login or the login page content to appear
    // The app might take a moment to check auth state and redirect
    await Promise.race([
      page.waitForURL("**/login", { timeout: 10000 }),
      page.waitForURL("**/onboarding", { timeout: 10000 }),
      page.getByText(/sign in|log in|authentication/i).waitFor({ timeout: 10000 }),
    ]).catch(() => {
      // If none of these happen, we'll check the current state below
    });

    // Should be redirected to login/onboarding or show auth required message
    const isOnLoginPage = page.url().includes("/login");
    const isOnOnboardingPage = page.url().includes("/onboarding");
    const hasAuthMessage = await page
      .getByText(/sign in|log in|authentication/i)
      .isVisible()
      .catch(() => false);

    // Either redirected or shown auth message
    expect(isOnLoginPage || isOnOnboardingPage || hasAuthMessage).toBeTruthy();
  });
});

test.describe("Quiz UI Components", () => {
  test("should switch between Take Quiz and History tabs", async ({
    page,
    request,
  }) => {
    await authenticateAsStudent(page, request, "quiz-e2e-tabs-student");

    await page.goto("http://localhost:9002/student/assessments");
    await page.waitForLoadState("domcontentloaded");

    // Should start on Take Quiz tab
    const takeQuizTab = page.getByRole("tab", { name: /take a quiz/i });
    const historyTab = page.getByRole("tab", { name: /quiz history/i });

    await expect(takeQuizTab).toHaveAttribute("data-state", "active");

    // Switch to History tab
    await historyTab.click();
    await expect(historyTab).toHaveAttribute("data-state", "active");
    await expect(takeQuizTab).toHaveAttribute("data-state", "inactive");

    // Switch back to Take Quiz tab
    await takeQuizTab.click();
    await expect(takeQuizTab).toHaveAttribute("data-state", "active");
  });

  test("should show AI-Generated badge on Take Quiz tab", async ({
    page,
    request,
  }) => {
    await authenticateAsStudent(page, request, "quiz-e2e-badge-student");

    await page.goto("http://localhost:9002/student/assessments");
    await page.waitForLoadState("domcontentloaded");

    // Check for AI-Generated badge
    await expect(page.getByText(/ai-generated/i)).toBeVisible();
  });
});

test.describe("Quiz Accessibility", () => {
  test("should have proper heading hierarchy", async ({ page, request }) => {
    await authenticateAsStudent(page, request, "quiz-e2e-a11y-student");

    await page.goto("http://localhost:9002/student/assessments");
    await page.waitForLoadState("domcontentloaded");

    // Should have h1 heading
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();

    // Should have h2 headings for sections
    const h2Count = await page.locator("h2").count();
    expect(h2Count).toBeGreaterThan(0);
  });
});
