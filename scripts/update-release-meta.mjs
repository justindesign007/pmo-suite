import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const log = execFileSync('git', ['log', '-5', '--date=short', '--pretty=format:%h%x09%ad%x09%s'], {
  encoding: 'utf8',
});

const entries = log
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [commit, date, ...messageParts] = line.split('\t');
    return { commit, date, message: messageParts.join('\t') };
  });

const lastTag = (() => {
  try {
    return execFileSync('git', ['describe', '--tags', '--abbrev=0'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '0.6.0';
  }
})();

const today = new Date().toISOString().slice(0, 10);
const content = `window.PMO_META = ${JSON.stringify({
  version: lastTag.replace(/^v/, ''),
  buildDate: today,
  dataSchema: 1,
  changelog: entries,
}, null, 2)};\n`;

writeFileSync(new URL('../src/meta.js', import.meta.url), content);
