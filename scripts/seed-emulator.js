import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const PROJECT_ID = 'unendingvoid-app';
const BASE_URL = `http://${EMULATOR_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function encodeValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(encodeValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = encodeValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function objectToFirestoreFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'id') continue;
    fields[key] = encodeValue(value);
  }
  fields['updatedAt'] = { timestampValue: new Date().toISOString() };
  fields['createdAt'] = { timestampValue: new Date().toISOString() };
  return { fields };
}

async function seedCollection(collectionName, filename) {
  const filePath = path.join(rootDir, 'seed', filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`[Seed] File not found: ${filePath}`);
    return;
  }

  const items = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`[Seed] Seeding ${items.length} documents into '${collectionName}'...`);

  let successCount = 0;
  for (const item of items) {
    const docId = item.id || item.uid;
    const body = objectToFirestoreFields(item);
    const url = `${BASE_URL}/${collectionName}/${docId}`;

    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        successCount++;
      } else {
        const errText = await res.text();
        console.error(`[Seed] Failed to write ${collectionName}/${docId}:`, errText);
      }
    } catch (err) {
      console.error(`[Seed] Network error for ${collectionName}/${docId}:`, err.message);
    }
  }

  console.log(`[Seed] Successfully seeded ${successCount}/${items.length} into '${collectionName}'.`);
}

async function main() {
  console.log(`=== Unending Void Emulator Seed Tool ===`);
  console.log(`Target: http://${EMULATOR_HOST} (Project: ${PROJECT_ID})`);

  try {
    const testPing = await fetch(`http://${EMULATOR_HOST}/`, { method: 'GET' }).catch(() => null);
    if (!testPing) {
      console.log(`\nNote: Firestore emulator is not running at ${EMULATOR_HOST}.`);
      console.log(`Start emulators with 'firebase emulators:start' before seeding.\n`);
    }
  } catch {}

  await seedCollection('players', 'players.json');
  await seedCollection('items', 'items.json');
  await seedCollection('traits', 'traits.json');

  console.log(`=== Seeding completed ===\n`);
}

main().catch(console.error);
