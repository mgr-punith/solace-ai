import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { User } from '@solace/shared';
import type { GoogleIdentity } from './google.js';

type UserRow = { id: string; email: string; name: string; avatar_url: string | null };
const user = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  avatarUrl: row.avatar_url,
});
type Refresh = { hash: string; expiresAt: Date };
export function createAuthRepository(pool: Pool) {
  async function transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
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
    async signIn(identity: GoogleIdentity, refresh: Refresh, now: Date) {
      return transaction(async (client) => {
        const inserted = await client.query<UserRow>(
          `INSERT INTO users (google_sub, email, name, avatar_url, updated_at) VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (google_sub) DO UPDATE SET email = excluded.email, name = excluded.name, avatar_url = excluded.avatar_url, updated_at = excluded.updated_at
           RETURNING id, email, name, avatar_url`,
          [identity.sub, identity.email, identity.name, identity.avatarUrl, now],
        );
        const person = inserted.rows[0]!;
        const sessionId = randomUUID();
        await client.query(
          'INSERT INTO auth_sessions (id, user_id, created_at, updated_at) VALUES ($1, $2, $3, $3)',
          [sessionId, person.id, now],
        );
        await client.query(
          'INSERT INTO refresh_tokens (user_id, session_id, token_hash, expires_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $5)',
          [person.id, sessionId, refresh.hash, refresh.expiresAt, now],
        );
        return { user: user(person), sessionId };
      });
    },
    async rotate(hash: string, next: Refresh, now: Date) {
      return transaction(async (client) => {
        // Lock the session first so every operation in this family uses the same lock order.
        const found = await client.query<{
          session_id: string;
          user_id: string;
          revoked_at: Date | null;
        }>(
          `SELECT s.id AS session_id, s.user_id, s.revoked_at FROM auth_sessions s
           JOIN refresh_tokens r ON r.session_id = s.id WHERE r.token_hash = $1 FOR UPDATE OF s`,
          [hash],
        );
        const session = found.rows[0];
        if (!session || session.revoked_at) return null;
        const stored = await client.query<{
          id: string;
          revoked_at: Date | null;
          expires_at: Date;
        }>('SELECT id, revoked_at, expires_at FROM refresh_tokens WHERE token_hash = $1', [hash]);
        const previous = stored.rows[0]!;
        if (previous.revoked_at || previous.expires_at <= now) {
          await client.query(
            'UPDATE auth_sessions SET revoked_at = $2, updated_at = $2 WHERE id = $1',
            [session.session_id, now],
          );
          await client.query(
            'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, $2), updated_at = $2 WHERE session_id = $1',
            [session.session_id, now],
          );
          return null; // Commit replay revocation before the service returns 401.
        }
        const nextId = randomUUID();
        await client.query(
          'INSERT INTO refresh_tokens (id, user_id, session_id, token_hash, expires_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $6)',
          [nextId, session.user_id, session.session_id, next.hash, next.expiresAt, now],
        );
        await client.query(
          'UPDATE refresh_tokens SET revoked_at = $2, updated_at = $2, replaced_by = $3 WHERE id = $1',
          [previous.id, now, nextId],
        );
        const person = await client.query<UserRow>(
          'SELECT id, email, name, avatar_url FROM users WHERE id = $1',
          [session.user_id],
        );
        return { user: user(person.rows[0]!), sessionId: session.session_id };
      });
    },
    async logout(hash: string, now: Date) {
      await transaction(async (client) => {
        const result = await client.query<{ id: string }>(
          'SELECT s.id FROM auth_sessions s JOIN refresh_tokens r ON r.session_id = s.id WHERE r.token_hash = $1 FOR UPDATE OF s',
          [hash],
        );
        const session = result.rows[0];
        if (!session) return;
        await client.query(
          'UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, $2), updated_at = $2 WHERE id = $1',
          [session.id, now],
        );
        await client.query(
          'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, $2), updated_at = $2 WHERE session_id = $1',
          [session.id, now],
        );
      });
    },
    async current(userId: string, sessionId: string) {
      const result = await pool.query<UserRow>(
        `SELECT u.id, u.email, u.name, u.avatar_url FROM users u JOIN auth_sessions s ON s.user_id = u.id
         WHERE u.id = $1 AND s.id = $2 AND s.revoked_at IS NULL`,
        [userId, sessionId],
      );
      return result.rows[0] ? user(result.rows[0]) : null;
    },
    async deleteAccount(userId: string) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    },
  };
}
export type AuthRepository = ReturnType<typeof createAuthRepository>;
