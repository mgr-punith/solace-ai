import { beforeEach, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { dailyQuestions, QUESTIONNAIRE_VERSION, type QuestionnaireStatus } from '@solace/shared';
import { router } from 'expo-router';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { QuestionnaireScreen } from '../QuestionnaireScreen';
import { questionnaireApi } from '../api';
import { questionnaireDraftKey } from '../draft';
import { AuthApiError } from '../../../lib/api';
import { DailyQuestionsCard } from '../DailyQuestionsCard';

let mockUser = 'a';
let current: QuestionnaireStatus;
jest.mock('../api', () => ({ questionnaireApi: { today: jest.fn(), save: jest.fn() } }));
jest.mock('expo-router', () => ({
  useIsFocused: () => true,
  useFocusEffect: jest.fn(),
  router: {
    replace: jest.fn(),
    navigate: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  },
}));
jest.mock('../../auth/context', () => ({
  useAuth: () => ({
    session: { user: { id: mockUser } },
    status: 'signedIn',
    request: <T,>(action: (token: string) => Promise<T>) => action('token'),
  }),
}));
jest.mock('../../../lib/useMotionPreferences', () => ({
  useMotionPreferences: () => ({ active: true, reduceMotion: true }),
}));
jest.mock('../../../lib/haptics', () => ({ gentleHaptic: jest.fn() }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
beforeEach(() => {
  mockUser = 'a';
  current = {
    day: '2026-11-09',
    timezone: 'Asia/Kolkata',
    version: QUESTIONNAIRE_VERSION,
    questions: dailyQuestions('2026-11-09'),
    pointsAvailable: 40,
    totalPoints: 80,
    completion: null,
  };
  jest.mocked(questionnaireApi.today).mockImplementation(async () => current);
  jest.mocked(questionnaireApi.save).mockImplementation(async (_token, day) => {
    const completion = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      day,
      timezone: 'Asia/Kolkata',
      points: 40 as const,
      completedAt: '2026-11-09T12:00:00Z',
    };
    current = { ...current, completion, totalPoints: 120 };
    return { totalPoints: 120, completion };
  });
});
function client() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
}
function tree(queryClient: QueryClient) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <QuestionnaireScreen />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
async function answerFour() {
  for (let index = 0; index < 4; index++) {
    await screen.findByText(new RegExp(`Question ${index + 1} of 4`));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Prefer to skip' }));
    const name = index === 3 ? 'Review answers' : 'Next question';
    await waitFor(() =>
      expect(screen.getByRole('button', { name }).props.accessibilityState.disabled).toBe(false),
    );
    await fireEvent.press(screen.getByRole('button', { name }));
  }
  await screen.findByText('Your four answers');
}
it('requires explicit answers and review, then saves once and shows confirmed points', async () => {
  await render(tree(client()));
  expect(
    (await screen.findByRole('button', { name: 'Next question' })).props.accessibilityState
      .disabled,
  ).toBe(true);
  await answerFour();
  expect(questionnaireApi.save).not.toHaveBeenCalled();
  expect(screen.getByText('Your four answers')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Finish and earn 40 points' }));
  expect(await screen.findByText('120 points total')).toBeTruthy();
  expect(questionnaireApi.save).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Finish and earn 40 points' })).toBeNull();
});
it('preserves selection and step across Close/reopen, and isolates a different account', async () => {
  const cache = client();
  const app = await render(tree(cache));
  await fireEvent.press(await screen.findByRole('radio', { name: 'Prefer to skip' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Next question' }).props.accessibilityState.disabled,
    ).toBe(false),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Next question' }));
  await screen.findByText(/Question 2 of 4/);
  await fireEvent.press(screen.getByRole('button', { name: 'Close daily questions' }));
  expect(router.back).toHaveBeenCalled();
  await app.unmount();
  const reopened = await render(tree(cache));
  expect(await screen.findByText(/Question 2 of 4/)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Previous question' }));
  await waitFor(() =>
    expect(
      screen.getByRole('radio', { name: 'Prefer to skip' }).props.accessibilityState.checked,
    ).toBe(true),
  );
  mockUser = 'b';
  await reopened.rerender(tree(cache));
  expect(await screen.findByText(/Question 1 of 4/)).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'Next question' }).props.accessibilityState.disabled,
  ).toBe(true);
});
it('keeps exact input after a save failure and awards nothing until retry confirms', async () => {
  jest.mocked(questionnaireApi.save).mockRejectedValueOnce(new Error('offline'));
  await render(tree(client()));
  await answerFour();
  await fireEvent.press(screen.getByRole('button', { name: 'Finish and earn 40 points' }));
  await screen.findByRole('button', { name: 'Retry saving your four' });
  expect(screen.queryByText('120 points total')).toBeNull();
  const first = jest.mocked(questionnaireApi.save).mock.calls[0];
  await fireEvent.press(screen.getByRole('button', { name: 'Retry saving your four' }));
  await screen.findByText('120 points total');
  expect(jest.mocked(questionnaireApi.save).mock.calls[1]).toEqual(first);
});
it('recovers loading errors and shows an already completed day without awarding again', async () => {
  current.completion = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    day: current.day,
    timezone: current.timezone,
    points: 40,
    completedAt: '2026-11-09T10:00:00Z',
  };
  jest.mocked(questionnaireApi.today).mockRejectedValueOnce(new Error('offline'));
  await render(tree(client()));
  await fireEvent.press(await screen.findByRole('button', { name: 'Reload daily questions' }));
  expect(await screen.findByText('80 points total')).toBeTruthy();
  expect(questionnaireApi.save).not.toHaveBeenCalled();
  expect(screen.queryByRole('radio')).toBeNull();
});
it('replaces an expired draft only after the user opens the new day', async () => {
  const cache = client();
  jest
    .mocked(questionnaireApi.save)
    .mockRejectedValueOnce(
      new AuthApiError(409, 'QUESTIONNAIRE_DAY_CHANGED', 'A new day has started.'),
    );
  await render(tree(cache));
  await answerFour();
  await fireEvent.press(screen.getByRole('button', { name: 'Finish and earn 40 points' }));
  await screen.findByRole('button', { name: 'Open today’s four' });
  expect(cache.getQueryData(questionnaireDraftKey('a'))).toMatchObject({ day: '2026-11-09' });
  current = { ...current, day: '2026-11-10', questions: dailyQuestions('2026-11-10') };
  await fireEvent.press(screen.getByRole('button', { name: 'Open today’s four' }));
  await waitFor(() =>
    expect(cache.getQueryData(questionnaireDraftKey('a'))).toMatchObject({
      day: '2026-11-10',
      answers: [],
    }),
  );
});
it('does not restore an old account draft when a pending save resolves after the cache is cleared', async () => {
  let finish!: (value: Awaited<ReturnType<typeof questionnaireApi.save>>) => void;
  jest.mocked(questionnaireApi.save).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const cache = client();
  const app = await render(tree(cache));
  await answerFour();
  await fireEvent.press(screen.getByRole('button', { name: 'Finish and earn 40 points' }));
  await app.unmount();
  cache.clear();
  await act(async () =>
    finish({
      totalPoints: 120,
      completion: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        day: '2026-11-09',
        timezone: 'Asia/Kolkata',
        points: 40,
        completedAt: '2026-11-09T12:00:00Z',
      },
    }),
  );
  expect(cache.getQueryData(questionnaireDraftKey('a'))).toBeUndefined();
});

it('keeps a pending save across Close and reopening without sending a second request', async () => {
  let finish!: (value: Awaited<ReturnType<typeof questionnaireApi.save>>) => void;
  jest.mocked(questionnaireApi.save).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const cache = client();
  const app = await render(tree(cache));
  await answerFour();
  await fireEvent.press(screen.getByRole('button', { name: 'Finish and earn 40 points' }));
  await screen.findByLabelText('Saving daily questions');
  await fireEvent.press(screen.getByRole('button', { name: 'Close daily questions' }));
  await app.unmount();
  await render(tree(cache));
  expect(
    (await screen.findByRole('button', { name: 'Saving your four…' })).props.accessibilityState
      .disabled,
  ).toBe(true);
  expect(screen.queryByText('120 points total')).toBeNull();
  await act(async () =>
    finish({
      totalPoints: 120,
      completion: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        day: current.day,
        timezone: current.timezone,
        points: 40,
        completedAt: '2026-11-09T12:00:00Z',
      },
    }),
  );
  await screen.findByText('120 points total');
  expect(questionnaireApi.save).toHaveBeenCalledTimes(1);
});

it('lets a user correct an answer from the review and only opens an optional activity after saving', async () => {
  await render(tree(client()));
  await answerFour();
  await fireEvent.press(screen.getByRole('button', { name: 'Edit Focus answer: Prefer to skip' }));
  await screen.findByText(/Question 3 of 4/);
  const focus = current.questions.find((question) => question.topic === 'Focus')!;
  await fireEvent.press(screen.getByRole('radio', { name: focus.options[0]!.label }));
  await waitFor(() =>
    expect(
      screen.getByRole('radio', { name: focus.options[0]!.label }).props.accessibilityState.checked,
    ).toBe(true),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Next question' }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Review answers' }));
  await screen.findByText('Your four answers');
  expect(questionnaireApi.save).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Finish and earn 40 points' }));
  await fireEvent.press(await screen.findByRole('button', { name: 'Open breathing' }));
  expect(router.replace).toHaveBeenCalledWith('/breathing');
  expect(jest.mocked(questionnaireApi.save).mock.calls[0]?.[2].answers).toContainEqual({
    questionId: focus.id,
    optionId: 'low',
  });
});

it('keeps the saved day visible through midnight and opens the next four only on request', async () => {
  const cache = client();
  const app = await render(tree(cache));
  await answerFour();
  await fireEvent.press(screen.getByRole('button', { name: 'Finish and earn 40 points' }));
  await screen.findByText('120 points total');
  current = {
    ...current,
    day: '2026-11-10',
    questions: dailyQuestions('2026-11-10'),
    completion: null,
  };
  await act(async () => {
    await cache.invalidateQueries({ queryKey: ['questionnaire', 'a', 'today'] });
  });
  expect(await screen.findByText('40 points saved for 2026-11-09.')).toBeTruthy();
  expect(screen.queryByRole('radio')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Open today’s four' }));
  await screen.findByText(/Question 1 of 4/);
  expect(cache.getQueryData(questionnaireDraftKey('a'))).toMatchObject({
    day: '2026-11-10',
    answers: [],
  });
  expect(questionnaireApi.save).toHaveBeenCalledTimes(1);
  await app.unmount();
});

it('shows unknown points as loading and offers recovery on the entry card', async () => {
  let fail!: (reason: Error) => void;
  jest.mocked(questionnaireApi.today).mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        fail = reject;
      }),
  );
  await render(
    <QueryClientProvider client={client()}>
      <ThemeProvider>
        <DailyQuestionsCard />
      </ThemeProvider>
    </QueryClientProvider>,
  );
  expect(await screen.findByLabelText('Loading daily questions')).toBeTruthy();
  expect(screen.queryByText('0 points so far')).toBeNull();
  await act(async () => fail(new Error('offline')));
  await fireEvent.press(await screen.findByRole('button', { name: 'Reload daily questions' }));
  expect(await screen.findByText('80 points so far')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Answer today’s four' }));
  expect(router.push).toHaveBeenCalledWith('/daily-questions');
});
