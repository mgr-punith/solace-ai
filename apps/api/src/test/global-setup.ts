import { execFile } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { Pool } from 'pg';
import type { TestProject } from 'vitest/node';
import { testDatabaseConfig, type TestDatabaseSettings } from './database-config.js';

const exec = promisify(execFile);
const image = 'docker.io/library/postgres:17-alpine';

async function findRuntime() {
  for (const runtime of ['podman', 'docker']) {
    try {
      await exec(runtime, ['info'], { timeout: 10_000 });
      return runtime;
    } catch {
      // Try the next installed runtime without printing daemon configuration.
    }
  }
  throw new Error('API tests need Podman or Docker running. No Neon test branch is required.');
}

export default async function setup(project: TestProject) {
  const runtime = await findRuntime();
  const name = `solace-test-${randomUUID()}`;
  const password = randomBytes(32).toString('hex');
  const database = `solace_test_${randomUUID().replaceAll('-', '')}`;
  const cleanup = async () => {
    try {
      await exec(runtime, ['rm', '--force', '--volumes', name], { timeout: 20_000 });
    } catch {
      throw new Error(`Could not remove test container ${name}. Run: ${runtime} rm -fv ${name}`);
    }
  };
  try {
    process.stdout.write(
      'Starting disposable PostgreSQL for API tests (first run downloads the image).\n',
    );
    await exec(
      runtime,
      [
        'run',
        '--detach',
        '--rm',
        '--name',
        name,
        '--publish',
        '127.0.0.1::5432',
        '--tmpfs',
        '/var/lib/postgresql/data:rw',
        '--env',
        'POSTGRES_USER',
        '--env',
        'POSTGRES_PASSWORD',
        '--env',
        'POSTGRES_DB',
        image,
      ],
      {
        timeout: 300_000,
        // Pass the ephemeral password through the environment, never command arguments.
        env: {
          ...process.env,
          POSTGRES_USER: 'solace_test',
          POSTGRES_PASSWORD: password,
          POSTGRES_DB: database,
        },
      },
    );
    const { stdout } = await exec(runtime, ['port', name, '5432/tcp'], { timeout: 10_000 });
    const port = /^127\.0\.0\.1:(\d+)$/m.exec(stdout.trim())?.[1];
    if (!port) throw new Error('Test container did not publish a loopback port.');
    const settings: TestDatabaseSettings = {
      host: '127.0.0.1',
      port: Number(port),
      database,
      user: 'solace_test',
      password,
    };
    const pool = new Pool(testDatabaseConfig(settings));
    let ready = false;
    try {
      for (let attempt = 0; attempt < 30; attempt++) {
        try {
          await pool.query('SELECT 1');
          ready = true;
          break;
        } catch {
          await delay(500);
        }
      }
    } finally {
      await pool.end();
    }
    if (!ready) throw new Error('Test PostgreSQL did not become ready.');
    project.provide('testDatabase', settings);
  } catch {
    // Raw driver/container errors can contain connection details; do not print them.
    await cleanup();
    throw new Error(
      'Could not start disposable PostgreSQL. Check Podman/Docker and image download access.',
    );
  }
  return cleanup;
}
