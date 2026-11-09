import type {
  QuestionnaireAnswer,
  QuestionnaireInput,
  QuestionnaireSave,
  QuestionnaireStatus,
} from '@solace/shared';

export type QuestionnaireDraft = {
  day: string;
  timezone: string;
  version: QuestionnaireStatus['version'];
  questions: QuestionnaireStatus['questions'];
  answers: QuestionnaireAnswer[];
  step: number;
  pending: QuestionnaireInput | null;
  result: QuestionnaireSave | null;
  failure: 'retry' | 'day-changed' | 'invalid' | null;
};
export const questionnaireDraftKey = (userId: string | undefined) =>
  ['questionnaire', userId, 'draft'] as const;
export const questionnaireKey = (userId: string | undefined, timezone: string, day: string) =>
  ['questionnaire', userId, 'today', timezone, day] as const;
export function newQuestionnaireDraft(status: QuestionnaireStatus): QuestionnaireDraft {
  return {
    day: status.day,
    timezone: status.timezone,
    version: status.version,
    questions: status.questions,
    answers: [],
    step: 0,
    pending: null,
    result: null,
    failure: null,
  };
}
export function chooseAnswer(
  draft: QuestionnaireDraft,
  questionId: string,
  optionId: QuestionnaireAnswer['optionId'],
): QuestionnaireDraft {
  if (draft.pending || draft.result) return draft;
  const question = draft.questions.find((item) => item.id === questionId);
  if (!question?.options.some((option) => option.id === optionId)) return draft;
  return {
    ...draft,
    failure: null,
    answers: [
      ...draft.answers.filter((answer) => answer.questionId !== questionId),
      { questionId, optionId },
    ],
  };
}
