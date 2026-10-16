import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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

const JULES_API_KEY = getEnv('jules_api_key');
const SOURCE = 'sources/github/JudasTheUG/unendingvoid';
const BASE_URL = 'https://jules.googleapis.com/v1alpha';

export async function createJulesSession(prompt, startingBranch = 'main') {
  if (!JULES_API_KEY) {
    throw new Error('jules_api_key not found in .env');
  }

  const payload = {
    prompt,
    sourceContext: {
      source: SOURCE,
      githubRepoContext: {
        startingBranch,
      },
    },
  };

  const res = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': JULES_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jules API error (${res.status}): ${err}`);
  }

  return await res.json();
}

export async function listJulesSessions() {
  if (!JULES_API_KEY) {
    throw new Error('jules_api_key not found in .env');
  }

  const res = await fetch(`${BASE_URL}/sessions`, {
    headers: {
      'x-goog-api-key': JULES_API_KEY,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jules API error (${res.status}): ${err}`);
  }

  return await res.json();
}

// CLI usage: node scripts/jules-dispatch.js [list | create "prompt"]
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';

  console.log(`=== Jules Async Coding Agent Controller ===`);
  console.log(`Source: ${SOURCE}\n`);

  if (command === 'list') {
    const data = await listJulesSessions();
    console.log('Active Sessions:', JSON.stringify(data, null, 2));
  } else if (command === 'create') {
    const prompt = args[1] || 'Add component test suites and verify i18n keys';
    console.log(`Dispatching task to Jules: "${prompt}"...`);
    const session = await createJulesSession(prompt);
    console.log('Session Created Successfully:');
    console.log(JSON.stringify(session, null, 2));
  } else {
    console.log('Usage: node scripts/jules-dispatch.js [list | create "<task prompt>"]');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
