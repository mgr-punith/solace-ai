import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';

const project = fileURLToPath(new URL('../', import.meta.url));
const sdk = process.env.ANDROID_HOME ?? join(homedir(), 'Android', 'Sdk');
const java = process.env.JAVA_HOME ?? join(homedir(), '.local', 'share', 'solace', 'jdk-21');
const artifacts = join(project, 'dist', 'local');
const working = join(homedir(), '.cache', 'solace', 'android-build');

if (!existsSync(join(sdk, 'platform-tools', 'adb')) || !existsSync(join(java, 'bin', 'javac'))) {
  process.stderr.write(
    'Android SDK or Java compiler is missing. See docs/setup/android-local.md.\n',
  );
  process.exit(1);
}
mkdirSync(artifacts, { recursive: true });
mkdirSync(working, { recursive: true, mode: 0o700 });

const child = spawn(
  'npx',
  [
    'eas-cli@latest',
    'build',
    '--platform',
    'android',
    '--profile',
    'development-local',
    '--local',
    '--non-interactive',
    '--output',
    join(artifacts, 'solace-development.apk'),
  ],
  {
    cwd: project,
    stdio: 'inherit',
    env: {
      ...process.env,
      JAVA_HOME: java,
      ANDROID_HOME: sdk,
      EAS_LOCAL_BUILD_WORKINGDIR: working,
      PATH: [
        join(java, 'bin'),
        join(sdk, 'platform-tools'),
        join(sdk, 'cmdline-tools', 'latest', 'bin'),
        process.env.PATH,
      ]
        .filter(Boolean)
        .join(':'),
    },
  },
);
child.on('error', () => {
  process.stderr.write('Could not start EAS CLI. Check Node.js and npm.\n');
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
