import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

// Resolve from this file, not the shell's working directory. CI env wins.
export function loadLocalEnv(): void {
  const path = fileURLToPath(new URL('../../.env', import.meta.url));
  if (existsSync(path)) loadEnvFile(path);
}
