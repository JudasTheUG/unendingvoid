import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read .env for github_pat
function getEnv(key) {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) return process.env[key];
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(`${key}=`)) {
      return trimmed.substring(key.length + 1).trim();
    }
  }
  return process.env[key];
}

const GITHUB_PAT = getEnv('github_pat');
const REPO = 'JudasTheUG/unendingvoid';
const RESULTS_FILE = path.join(rootDir, 'test-results.json');

async function getExistingIssueTitles() {
  if (!GITHUB_PAT) return [];
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/issues?state=open&labels=automated-test`, {
      headers: {
        Authorization: `Bearer ${GITHUB_PAT}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'UnendingVoid-Reporter',
      },
    });
    if (!res.ok) return [];
    const issues = await res.json();
    return issues.map((i) => i.title);
  } catch (err) {
    console.warn('[Reporter] Failed to fetch existing issues:', err.message);
    return [];
  }
}

async function createGitHubIssue(title, body) {
  if (!GITHUB_PAT) {
    console.warn('[Reporter] No github_pat found in .env; skipping issue creation.');
    return;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_PAT}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'UnendingVoid-Reporter',
      },
      body: JSON.stringify({
        title,
        body,
        labels: ['bug', 'automated-test'],
      }),
    });

    if (res.ok) {
      const issue = await res.json();
      console.log(`[Reporter] Created issue #${issue.number}: ${issue.html_url}`);
    } else {
      const err = await res.text();
      console.error(`[Reporter] GitHub API error:`, err);
    }
  } catch (err) {
    console.error(`[Reporter] Network error creating issue:`, err.message);
  }
}

async function main() {
  console.log('=== Running Vitest Suite with JSON Reporting ===');
  let vitestExitCode = 0;

  try {
    execSync(`npx vitest run --reporter=json --outputFile="${RESULTS_FILE}"`, {
      cwd: rootDir,
      stdio: 'inherit',
    });
  } catch (err) {
    vitestExitCode = 1;
  }

  if (!fs.existsSync(RESULTS_FILE)) {
    console.log('[Reporter] No test-results.json generated.');
    process.exit(vitestExitCode);
  }

  const results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
  const testResults = results.testResults || [];
  const failures = [];

  for (const suite of testResults) {
    const filePath = path.relative(rootDir, suite.name);
    for (const test of suite.assertionResults || []) {
      if (test.status === 'failed') {
        failures.push({
          file: filePath,
          title: test.title,
          ancestors: test.ancestorTitles?.join(' > ') || '',
          messages: test.failureMessages || [],
        });
      }
    }
  }

  if (failures.length === 0) {
    console.log('✅ All tests passed cleanly! No GitHub issues filed.');
    if (fs.existsSync(RESULTS_FILE)) fs.unlinkSync(RESULTS_FILE);
    process.exit(0);
  }

  console.log(`❌ Detected ${failures.length} test failure(s). Checking GitHub issues...`);
  const existingTitles = await getExistingIssueTitles();

  for (const failure of failures) {
    const issueTitle = `[TEST FAILURE] ${failure.ancestors ? `${failure.ancestors} > ` : ''}${failure.title}`;

    if (existingTitles.includes(issueTitle)) {
      console.log(`[Reporter] Skipping existing issue: "${issueTitle}"`);
      continue;
    }

    const issueBody = `### 🚨 Automated Test Failure Detected

**Test Name:** \`${failure.title}\`  
**Location:** [${failure.file}](https://github.com/${REPO}/blob/main/${failure.file.replace(/\\/g, '/')})  
**Suite:** \`${failure.ancestors}\`  
**Timestamp:** \`${new Date().toISOString()}\`  

#### Error Details & Stack Trace:
\`\`\`
${failure.messages.join('\n\n')}
\`\`\`

---
*Reported automatically by Jules & Vitest CI Reporter.*`;

    console.log(`[Reporter] Filing issue: "${issueTitle}"`);
    await createGitHubIssue(issueTitle, issueBody);
  }

  if (fs.existsSync(RESULTS_FILE)) fs.unlinkSync(RESULTS_FILE);
  process.exit(1);
}

main().catch(console.error);
