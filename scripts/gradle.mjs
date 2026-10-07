// Runs the Android Gradle wrapper on any OS: `node scripts/gradle.mjs assembleDebug`
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const androidDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'android');
const args = process.argv.slice(2);

const result =
  process.platform === 'win32'
    ? // .bat files must run through cmd.exe. `/s` strips one outer quote pair, so the whole
      // command is wrapped again — needed for paths containing cmd delimiters like "=".
      spawnSync('cmd.exe', ['/d', '/s', '/c', `""${path.join(androidDir, 'gradlew.bat')}" ${args.join(' ')}"`], {
        cwd: androidDir,
        stdio: 'inherit',
        windowsVerbatimArguments: true,
      })
    : spawnSync(path.join(androidDir, 'gradlew'), args, { cwd: androidDir, stdio: 'inherit' });

if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
