import { z } from 'zod';
import { timezoneSchema } from './mood.ts';

export const DAILY_QUESTION_POINTS = 40;
export const QUESTIONNAIRE_VERSION = 'daily-four-v1';
export const questionnaireDaySchema = z.iso.date();
export const answerOptionSchema = z.enum(['low', 'middle', 'high', 'skip']);
export const questionTopicSchema = z.enum(['Rest', 'Energy', 'Focus', 'Connection']);
export const dailyQuestionSchema = z.object({
  id: z.string().regex(/^four-v1-[0-6]-(rest|energy|focus|connection)$/),
  topic: questionTopicSchema,
  prompt: z.string().min(1).max(160),
  options: z
    .array(z.object({ id: answerOptionSchema, label: z.string().min(1).max(80) }))
    .length(4),
});
export type DailyQuestion = z.infer<typeof dailyQuestionSchema>;
export const questionnaireAnswerSchema = z.strictObject({
  questionId: dailyQuestionSchema.shape.id,
  optionId: answerOptionSchema,
});
export type QuestionnaireAnswer = z.infer<typeof questionnaireAnswerSchema>;
export const questionnaireInputSchema = z.strictObject({
  version: z.literal(QUESTIONNAIRE_VERSION),
  timezone: timezoneSchema,
  answers: z
    .array(questionnaireAnswerSchema)
    .length(4)
    .refine((answers) => new Set(answers.map((answer) => answer.questionId)).size === 4),
});
export type QuestionnaireInput = z.infer<typeof questionnaireInputSchema>;
export const questionnaireQuerySchema = z.strictObject({ timezone: timezoneSchema.default('UTC') });
export const questionnaireCompletionSchema = z.object({
  id: z.uuid(),
  day: questionnaireDaySchema,
  timezone: timezoneSchema,
  points: z.literal(DAILY_QUESTION_POINTS),
  completedAt: z.iso.datetime(),
});
export type QuestionnaireCompletion = z.infer<typeof questionnaireCompletionSchema>;
export const questionnaireStatusSchema = z.object({
  day: questionnaireDaySchema,
  timezone: timezoneSchema,
  version: z.literal(QUESTIONNAIRE_VERSION),
  pointsAvailable: z.literal(DAILY_QUESTION_POINTS),
  totalPoints: z.number().int().nonnegative(),
  questions: z.array(dailyQuestionSchema).length(4),
  completion: questionnaireCompletionSchema.nullable(),
});
export const questionnaireSaveSchema = z.object({
  completion: questionnaireCompletionSchema,
  totalPoints: z.number().int().nonnegative(),
});
export type QuestionnaireStatus = z.infer<typeof questionnaireStatusSchema>;
export type QuestionnaireSave = z.infer<typeof questionnaireSaveSchema>;

type Prompt = readonly [string, string, string, string];
// Original everyday reflection prompts. Order stays stable within this version.
const bank: Record<DailyQuestion['topic'], readonly Prompt[]> = {
  Rest: [
    [
      'How rested do you feel today?',
      'I could use more rest',
      'Somewhere in the middle',
      'Fairly rested',
    ],
    [
      'Did you get a chance to slow down today?',
      'Not yet',
      'For a little while',
      'I made some room for it',
    ],
    [
      'How did your last sleep leave you feeling?',
      'Still tired',
      'A little refreshed',
      'Well rested',
    ],
    ['Have you had a break that felt like a break?', 'Not so far', 'A short one', 'Yes, it helped'],
    ['How much room have you had to recharge?', 'Hardly any', 'A little', 'Enough for today'],
    [
      'How easy has it been to give yourself a pause?',
      'Difficult',
      'Possible with some effort',
      'Fairly easy',
    ],
    [
      'Have you found a quiet moment for yourself?',
      'Not yet',
      'A brief one',
      'Yes, I had some time',
    ],
  ],
  Energy: [
    [
      'How much energy do you have right now?',
      'Not much',
      'Enough for a few things',
      'I have some to spare',
    ],
    ['How has your energy been through the day?', 'Mostly low', 'Up and down', 'Fairly steady'],
    [
      'How does your current pace feel?',
      'Too much for me',
      'Manageable with breaks',
      'It suits me today',
    ],
    [
      'How much room do you have for one more task?',
      'I need to stop for now',
      'Only something small',
      'I could take one on',
    ],
    [
      'How are you feeling about what is left today?',
      'I need a lighter plan',
      'I can choose a few things',
      'I have enough energy',
    ],
    [
      'How much effort are everyday things taking?',
      'More than usual',
      'About the usual amount',
      'They feel fairly easy',
    ],
    [
      'How does your body feel after today so far?',
      'Worn out',
      'Somewhere in the middle',
      'Comfortably active',
    ],
  ],
  Focus: [
    [
      'How easy is it to stay with one thing today?',
      'My mind keeps wandering',
      'It comes and goes',
      'I can settle into things',
    ],
    ['How busy does your mind feel right now?', 'Very busy', 'A little busy', 'Fairly settled'],
    [
      'How clear does your next small step feel?',
      'I do not know where to start',
      'I have a rough idea',
      'I know what comes next',
    ],
    [
      'How often have you been pulled in different directions?',
      'A lot',
      'Now and then',
      'Not much',
    ],
    [
      'How has it felt to return to a task after a break?',
      'Hard to get started',
      'It takes a little time',
      'Fairly easy',
    ],
    [
      'How much space do you have to think today?',
      'It feels crowded',
      'A little space',
      'Enough to think clearly',
    ],
    [
      'How easy has it been to put one worry aside?',
      'It keeps coming back',
      'Sometimes I can',
      'I can return to the present',
    ],
  ],
  Connection: [
    [
      'How connected to other people do you feel today?',
      'I could use some company',
      'A little connected',
      'I feel connected',
    ],
    [
      'Have you had a chance to talk with someone you trust?',
      'Not today',
      'A brief conversation',
      'Yes, we had time',
    ],
    [
      'How easy would it feel to reach out to someone?',
      'Hard right now',
      'I could send a short message',
      'I feel comfortable doing that',
    ],
    ['Have you felt listened to today?', 'Not really', 'A little', 'Yes, someone heard me'],
    [
      'How supported do you feel with what is on your mind?',
      'I could use more support',
      'I have some support',
      'I feel supported',
    ],
    [
      'Have you shared a small part of your day with someone?',
      'Not yet',
      'Just a little',
      'Yes, we caught up',
    ],
    [
      'How satisfied are you with your time around others today?',
      'I would like more connection',
      'Some of it felt good',
      'It felt right for me',
    ],
  ],
};
const topics = ['Rest', 'Energy', 'Focus', 'Connection'] as const;

export function dailyQuestions(day: string): DailyQuestion[] {
  const validDay = questionnaireDaySchema.parse(day);
  const days = Math.floor(Date.parse(`${validDay}T00:00:00Z`) / 86_400_000);
  const index = ((days % 7) + 7) % 7;
  return topics.map((topic) => {
    const [prompt, low, middle, high] = bank[topic][index]!;
    return {
      id: `four-v1-${index}-${topic.toLowerCase()}`,
      topic,
      prompt,
      options: [
        { id: 'low', label: low },
        { id: 'middle', label: middle },
        { id: 'high', label: high },
        { id: 'skip', label: 'Prefer to skip' },
      ],
    };
  });
}

export function answersMatchDay(day: string, answers: readonly QuestionnaireAnswer[]): boolean {
  const expected = dailyQuestions(day);
  return (
    answers.length === 4 &&
    expected.every(
      (question) =>
        answers.filter(
          (answer) =>
            answer.questionId === question.id &&
            question.options.some((option) => option.id === answer.optionId),
        ).length === 1,
    )
  );
}

export function questionnaireSuggestion(
  day: string,
  answers: readonly QuestionnaireAnswer[],
): {
  title: string;
  description: string;
  action: string;
  route: '/breathing' | '/affirmations' | '/talk';
} {
  const questions = dailyQuestions(day);
  const choice = (topic: DailyQuestion['topic']) =>
    answers.find(
      (answer) => answer.questionId === questions.find((question) => question.topic === topic)?.id,
    )?.optionId;
  if (choice('Focus') === 'low')
    return {
      title: 'A short pause',
      description:
        'You said it was hard to settle your attention. Try a minute with Sol if you want a break.',
      action: 'Open breathing',
      route: '/breathing',
    };
  if (choice('Connection') === 'low')
    return {
      title: 'Room to talk',
      description: 'You could send someone a short message, or open a conversation with Sol.',
      action: 'Open Talk',
      route: '/talk',
    };
  if (choice('Rest') === 'low' || choice('Energy') === 'low')
    return {
      title: 'Keep the next step small',
      description: 'You can take a break here, or read today’s words before you carry on.',
      action: 'Open affirmations',
      route: '/affirmations',
    };
  if (answers.every((answer) => answer.optionId === 'skip') || !answers.length)
    return {
      title: 'Choose what fits',
      description: 'A short breathing break is here if you want one. You can also finish here.',
      action: 'Open breathing',
      route: '/breathing',
    };
  return {
    title: 'Anything you want to talk about?',
    description: 'You can open Talk and choose what to share with Sol.',
    action: 'Open Talk',
    route: '/talk',
  };
}
