import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { ChatActivity, ChatMessage, Conversation, SendMessageInput } from '@solace/shared';

type ConversationRow = {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  next_sequence: number;
  active_lease_id: string | null;
  active_request_id: string | null;
  active_until: Date | null;
};
type MessageRow = {
  id: string;
  conversation_id: string;
  request_id: string;
  sequence: number;
  role: ChatMessage['role'];
  content: string;
  status: ChatMessage['status'];
  kind: ChatMessage['kind'];
  activity: ChatActivity | null;
  created_at: Date;
};
const conversation = (r: ConversationRow): Conversation => ({
  id: r.id,
  title: r.title,
  createdAt: r.created_at.toISOString(),
  updatedAt: r.updated_at.toISOString(),
});
const message = (r: MessageRow): ChatMessage => ({
  id: r.id,
  conversationId: r.conversation_id,
  requestId: r.request_id,
  sequence: r.sequence,
  role: r.role,
  content: r.content,
  status: r.status,
  kind: r.kind,
  activity: r.activity,
  createdAt: r.created_at.toISOString(),
});
export type Claim =
  | { kind: 'missing' }
  | { kind: 'busy' }
  | { kind: 'conflict' }
  | { kind: 'stale' }
  | { kind: 'existing'; userMessage: ChatMessage; assistantMessage: ChatMessage }
  | { kind: 'claimed'; leaseId: string };
export function createConversationRepository(pool: Pool) {
  async function transaction<T>(fn: (client: PoolClient) => Promise<T>) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  return {
    async create(userId: string, requestId: string, now: Date) {
      const result = await pool.query<ConversationRow>(
        `INSERT INTO conversations (user_id, request_id, created_at, updated_at) VALUES ($1,$2,$3,$3) ON CONFLICT (user_id,request_id) DO UPDATE SET request_id=EXCLUDED.request_id RETURNING *`,
        [userId, requestId, now],
      );
      return conversation(result.rows[0]!);
    },
    async get(userId: string, id: string) {
      const result = await pool.query<ConversationRow>(
        'SELECT * FROM conversations WHERE id=$1 AND user_id=$2',
        [id, userId],
      );
      return result.rows[0] ? conversation(result.rows[0]) : null;
    },
    async list(userId: string, limit: number, cursor: { createdAt: string; id: string } | null) {
      const result = await pool.query<ConversationRow>(
        `SELECT * FROM conversations WHERE user_id=$1 AND ($3::timestamptz IS NULL OR (created_at,id)<($3::timestamptz,$4::uuid)) ORDER BY created_at DESC,id DESC LIMIT $2`,
        [userId, limit + 1, cursor?.createdAt ?? null, cursor?.id ?? null],
      );
      return result.rows.map(conversation);
    },
    async remove(userId: string, id: string) {
      return (
        (
          await pool.query('DELETE FROM conversations WHERE id=$1 AND user_id=$2 RETURNING id', [
            id,
            userId,
          ])
        ).rowCount! > 0
      );
    },
    async listMessages(userId: string, id: string, limit: number, before: number | null) {
      const result = await pool.query<MessageRow>(
        `SELECT m.* FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE c.id=$1 AND c.user_id=$2 AND ($4::integer IS NULL OR m.sequence<$4) ORDER BY m.sequence DESC LIMIT $3`,
        [id, userId, limit + 1, before],
      );
      return result.rows.map(message);
    },
    async context(userId: string, id: string) {
      const result = await pool.query<MessageRow>(
        `SELECT m.* FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE c.id=$1 AND c.user_id=$2 AND (m.role='user' OR (m.status='complete' AND m.kind IN ('normal','crisis'))) ORDER BY m.sequence DESC LIMIT 20`,
        [id, userId],
      );
      return result.rows.reverse().map(message);
    },
    async claim(userId: string, id: string, input: SendMessageInput, now: Date): Promise<Claim> {
      return transaction(async (client) => {
        const locked = await client.query<ConversationRow>(
          'SELECT * FROM conversations WHERE id=$1 AND user_id=$2 FOR UPDATE',
          [id, userId],
        );
        const c = locked.rows[0];
        if (!c) return { kind: 'missing' };
        const old = await client.query<MessageRow>(
          'SELECT * FROM messages WHERE conversation_id=$1 AND request_id=$2 ORDER BY sequence',
          [id, input.requestId],
        );
        const user = old.rows.find((m) => m.role === 'user');
        const assistant = old.rows.find((m) => m.role === 'assistant');
        if (user && user.content !== input.content) return { kind: 'conflict' };
        if (user && assistant?.status === 'complete')
          return {
            kind: 'existing',
            userMessage: message(user),
            assistantMessage: message(assistant),
          };
        if (user && assistant && assistant.sequence < c.next_sequence - 1) return { kind: 'stale' };
        if (c.active_lease_id && (c.active_until! > now || c.active_request_id !== input.requestId))
          return { kind: 'busy' };
        const leaseId = randomUUID();
        if (!user) {
          await client.query(
            `INSERT INTO messages (conversation_id,request_id,sequence,role,content,status,created_at) VALUES ($1,$2,$3,'user',$4,'pending',$5),($1,$2,$3+1,'assistant','','pending',$5)`,
            [id, input.requestId, c.next_sequence, input.content, now],
          );
        } else
          await client.query(
            `UPDATE messages SET status='pending',kind='normal',activity=NULL,content=CASE WHEN role='assistant' THEN '' ELSE content END WHERE conversation_id=$1 AND request_id=$2`,
            [id, input.requestId],
          );
        await client.query(
          `UPDATE conversations SET active_lease_id=$2,active_request_id=$3,active_until=$4,next_sequence=next_sequence+$5,updated_at=$6 WHERE id=$1`,
          [id, leaseId, input.requestId, new Date(now.getTime() + 60_000), user ? 0 : 2, now],
        );
        return { kind: 'claimed', leaseId };
      });
    },
    async finish(
      userId: string,
      id: string,
      requestId: string,
      leaseId: string,
      content: string,
      kind: ChatMessage['kind'],
      now: Date,
      activity: ChatActivity | null = null,
    ) {
      return transaction(async (client) => {
        const result = await client.query<ConversationRow>(
          'SELECT * FROM conversations WHERE id=$1 AND user_id=$2 FOR UPDATE',
          [id, userId],
        );
        if (!result.rows[0] || result.rows[0].active_lease_id !== leaseId) return null;
        await client.query(
          `UPDATE messages SET status=CASE WHEN role='assistant' AND $3='fallback' THEN 'failed' ELSE 'complete' END,content=CASE WHEN role='assistant' THEN $4 ELSE content END,kind=CASE WHEN role='assistant' THEN $3 ELSE kind END,activity=CASE WHEN role='assistant' THEN $5 ELSE NULL END WHERE conversation_id=$1 AND request_id=$2`,
          [id, requestId, kind, content, activity],
        );
        await client.query(
          `UPDATE conversations SET active_lease_id=NULL,active_request_id=NULL,active_until=NULL,updated_at=$2 WHERE id=$1`,
          [id, now],
        );
        const rows = await client.query<MessageRow>(
          'SELECT * FROM messages WHERE conversation_id=$1 AND request_id=$2 ORDER BY sequence',
          [id, requestId],
        );
        return { userMessage: message(rows.rows[0]!), assistantMessage: message(rows.rows[1]!) };
      });
    },
  };
}
export type ConversationRepository = ReturnType<typeof createConversationRepository>;
