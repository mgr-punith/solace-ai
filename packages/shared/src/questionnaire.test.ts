import { describe, expect, it } from 'vitest';
import {
  DAILY_QUESTION_POINTS,
  QUESTIONNAIRE_VERSION,
  answersMatchDay,
  dailyQuestions,
  questionnaireInputSchema,
  questionnaireSuggestion,
} from './questionnaire.ts';
import { localDay } from './mood.ts';

describe('four daily reflection questions', () => {
  it('rotates seven stable sets with four distinct topics and a skip choice', () => {
    const ids = new Set<string>();
    for (let day = 1; day <= 7; day++) {
      const date = `2026-11-0${day}`;
      const questions = dailyQuestions(date);
      expect(questions).toHaveLength(4);
      expect(new Set(questions.map((q) => q.topic)).size).toBe(4);
      expect(dailyQuestions(date)).toEqual(questions);
      for (const q of questions) {
        ids.add(q.id);
        expect(q.options.map((o) => o.id)).toEqual(['low', 'middle', 'high', 'skip']);
        expect(q.options.at(-1)?.label).toBe('Prefer to skip');
      }
    }
    expect(ids.size).toBe(28);
    expect(dailyQuestions('2026-11-01')).toEqual(dailyQuestions('2026-11-08'));
  });

  it('validates all four expected questions and rejects duplicate IDs, foreign choices and points', () => {
    const day = '2026-11-09';
    const answers = dailyQuestions(day).map((q) => ({
      questionId: q.id,
      optionId: 'skip' as const,
    }));
    const input = { timezone: 'Asia/Kolkata', version: QUESTIONNAIRE_VERSION, answers };
    expect(questionnaireInputSchema.safeParse(input).success).toBe(true);
    expect(answersMatchDay(day, answers)).toBe(true);
    expect(answersMatchDay('2026-11-10', answers)).toBe(false);
    expect(questionnaireInputSchema.safeParse({ ...input, points: 400 }).success).toBe(false);
    expect(
      questionnaireInputSchema.safeParse({ ...input, answers: answers.slice(1) }).success,
    ).toBe(false);
    expect(
      questionnaireInputSchema.safeParse({ ...input, answers: Array(4).fill(answers[0]) }).success,
    ).toBe(false);
    expect(
      questionnaireInputSchema.safeParse({
        ...input,
        answers: answers.map((a) => ({ ...a, optionId: 'perfect' })),
      }).success,
    ).toBe(false);
    expect(DAILY_QUESTION_POINTS).toBe(40);
  });

  it('follows the local calendar across midnight and DST rather than a rolling 24-hour timer', () => {
    const instant = new Date('2026-11-08T18:30:00Z');
    expect(localDay(instant, 'Asia/Kolkata')).toBe('2026-11-09');
    expect(localDay(instant, 'UTC')).toBe('2026-11-08');
    expect(dailyQuestions(localDay(instant, 'Asia/Kolkata'))).not.toEqual(
      dailyQuestions(localDay(instant, 'UTC')),
    );
    expect(dailyQuestions(localDay(new Date('2026-11-01T05:30:00Z'), 'America/New_York'))).toEqual(
      dailyQuestions(localDay(new Date('2026-11-01T06:30:00Z'), 'America/New_York')),
    );
  });

  it('offers an optional existing activity without turning answers into a health score', () => {
    const day = '2026-11-09';
    const answers = dailyQuestions(day).map((q) => ({
      questionId: q.id,
      optionId: 'high' as const,
    }));
    expect(questionnaireSuggestion(day, answers).route).toBe('/talk');
    const focus = dailyQuestions(day).find((q) => q.topic === 'Focus')!;
    expect(
      questionnaireSuggestion(
        day,
        answers.map((a) => ({ ...a, optionId: a.questionId === focus.id ? 'low' : a.optionId })),
      ).route,
    ).toBe('/breathing');
    expect(
      questionnaireSuggestion(
        day,
        answers.map((a) => ({ ...a, optionId: 'skip' })),
      ).route,
    ).toBe('/breathing');
  });
});
