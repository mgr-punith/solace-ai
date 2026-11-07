import { expect, it } from '@jest/globals';
import { QueryClient } from '@tanstack/react-query';
import type { MoodCheckin } from '@solace/shared';
import { chatDraftKey, checkinDraft, reflectionDraft, seedChatDraft } from '../drafts';

it('prepares only the selected check-in as editable text without changing the source', () => {
  const entry: MoodCheckin = {
    id: 'entry',
    mood: 2,
    tags: ['Tired'],
    note: 'A long day.',
    timezone: 'UTC',
    createdAt: '2026-11-08T12:00:00Z',
  };
  const draft = checkinDraft(entry);
  expect(draft.text).toContain('Low');
  expect(draft.text).toContain('Tired');
  expect(draft.text).toContain('A long day.');
  expect(draft.origin).toBe('checkin');
  expect(draft.pending).toBeNull();
  expect(entry.note).toBe('A long day.');
});

it('keeps drafts in their account and never replaces an existing draft or an unconfirmed send', () => {
  const client = new QueryClient();
  const first = { text: 'Keep my words', origin: null, pending: null };
  expect(seedChatDraft(client, 'a', 'thread', first)).toBe(true);
  expect(seedChatDraft(client, 'a', 'thread', reflectionDraft(60, 4))).toBe(false);
  expect(client.getQueryData(chatDraftKey('a', 'thread'))).toEqual(first);
  expect(client.getQueryData(chatDraftKey('b', 'thread'))).toBeUndefined();
  client.setQueryData(chatDraftKey('a', 'pending'), {
    text: '',
    origin: null,
    pending: { content: 'Sent?', requestId: 'same-retry-key' },
  });
  expect(seedChatDraft(client, 'a', 'pending', reflectionDraft(60, null))).toBe(false);
  client.removeQueries({ queryKey: ['chat', 'a', 'thread'] });
  expect(client.getQueryData(chatDraftKey('a', 'thread'))).toBeUndefined();
  client.clear();
  expect(client.getQueryData(chatDraftKey('a', 'pending'))).toBeUndefined();
});

it('uses the actual duration and optional rating without claiming the break helped', () => {
  expect(reflectionDraft(180, null).text).toBe('I took a 3-minute breathing break.');
  expect(reflectionDraft(60, 2).text).toBe('I took a 1-minute breathing break. I feel Low now.');
});
