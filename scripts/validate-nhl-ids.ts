#!/usr/bin/env npx tsx
/**
 * Validate NHL_IDS in fetch-headshots.ts: each ID must resolve to a player
 * whose last name matches the key (e.g. key "aho" -> player lastName "Aho").
 *
 * Usage: npx tsx scripts/validate-nhl-ids.ts
 *
 * Reads NHL_IDS from fetch-headshots.ts (same structure). Reports mismatches.
 */

import * as fs from 'fs';
import * as path from 'path';

const FETCH_HEADSHOTS_PATH = path.join(
  process.cwd(),
  'scripts',
  'fetch-headshots.ts',
);

interface LandingResponse {
  firstName?: { default: string };
  lastName?: { default: string };
}

async function getPlayerName(nhlId: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api-web.nhle.com/v1/player/${nhlId}/landing`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as LandingResponse;
    const first = data.firstName?.default ?? '';
    const last = data.lastName?.default ?? '';
    return `${first} ${last}`.trim() || null;
  } catch {
    return null;
  }
}

/** Key like "aho" or "shea-theodore" -> expected last name for API match */
function keyToExpectedLastName(key: string): string {
  const part = key.split('-').pop() ?? key;
  if (part === 'ek') return 'Eriksson Ek'; // joel-eriksson-ek
  if (part === 'w' || part === 'e') return ''; // karlsson-w / karlsson-e
  const lower = part.toLowerCase();
  const capitalized = lower.charAt(0).toUpperCase() + lower.slice(1);
  if (key === 'eriksson-ek' || key === 'joel-eriksson-ek') return 'Eriksson Ek';
  if (key === 'tkachuk-matthew') return 'Tkachuk';
  if (key === 'tkachuk-brady') return 'Tkachuk';
  if (key === 'hughes-jack' || key === 'jack-hughes') return 'Hughes';
  if (key === 'hughes-quinn') return 'Hughes';
  if (key === 'sam-reinhart') return 'Reinhart';
  if (key === 'sam-bennett') return 'Bennett';
  if (key === 'leon-draisaitl') return 'Draisaitl';
  if (key === 'colton-parayko') return 'Parayko';
  if (key === 'shea-theodore') return 'Theodore';
  if (key === 'matt-boldy') return 'Boldy';
  if (key === 'brock-faber') return 'Faber';
  if (key === 'brock-nelson') return 'Nelson';
  if (key === 'jake-oettinger') return 'Oettinger';
  if (key === 'jake-sanderson') return 'Sanderson';
  if (key === 'elias-pettersson') return 'Pettersson';
  if (key === 'elias-lindholm') return 'Lindholm';
  if (key === 'hampus-lindholm') return 'Lindholm';
  if (key === 'artturi-lehkonen') return 'Lehkonen';
  if (key === 'nikolaj-ehlers') return 'Ehlers';
  if (key === 'esa-lindell') return 'Lindell';
  if (key === 'juraj-slafkovsky') return 'Slafkovský';
  if (key === 'niko-mikkola') return 'Mikkola';
  if (key === 'filip-hronek') return 'Hronek';
  return capitalized;
}

function normalizeLastName(apiName: string): string {
  const parts = apiName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? '';
}

function lastNamesMatch(apiLastName: string, expected: string): boolean {
  if (!expected) return true;
  const a = apiLastName.toLowerCase().replace(/\s/g, '');
  const b = expected.toLowerCase().replace(/\s/g, '').replace('é', 'e');
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return false;
}

function extractNhlIds(): Record<string, number> {
  const src = fs.readFileSync(FETCH_HEADSHOTS_PATH, 'utf-8');
  const start = src.indexOf('const NHL_IDS: Record<string, number> = {');
  if (start === -1) throw new Error('NHL_IDS not found');
  const end = src.indexOf('};', start) + 2;
  const block = src.slice(start, end);
  // Eval in a way that gives us the object (no eval for security; parse manually or use a regex)
  const entries: [string, number][] = [];
  const lines = block.split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*['"]?([^'":]+)['"]?\s*:\s*(\d+)/);
    if (m) {
      const key = m[1].replace(/^['"]|['"]$/g, '').trim();
      const id = parseInt(m[2], 10);
      entries.push([key, id]);
    }
  }
  return Object.fromEntries(entries);
}

async function main(): Promise<void> {
  const nhlIds = extractNhlIds();
  const uniqueIds = [...new Set(Object.values(nhlIds))];
  console.log(
    `Validating ${Object.keys(nhlIds).length} keys, ${uniqueIds.length} unique IDs...\n`,
  );

  const idToName = new Map<number, string>();
  for (const id of uniqueIds) {
    const name = await getPlayerName(id);
    idToName.set(id, name ?? '(unknown)');
    await new Promise((r) => setTimeout(r, 120));
  }

  const mismatches: Array<{
    key: string;
    id: number;
    apiName: string;
    expected: string;
  }> = [];
  for (const [key, id] of Object.entries(nhlIds)) {
    const apiName = idToName.get(id) ?? '(unknown)';
    const expected = keyToExpectedLastName(key);
    const apiLastName = normalizeLastName(apiName);
    if (!expected) continue;
    if (!lastNamesMatch(apiLastName, expected)) {
      mismatches.push({ key, id, apiName, expected });
    }
  }

  if (mismatches.length === 0) {
    console.log('All NHL_IDS entries match API player names.');
    return;
  }

  console.log('Mismatches (key -> ID resolves to wrong player):\n');
  for (const m of mismatches) {
    console.log(
      `  ${m.key}: ${m.id} -> "${m.apiName}" (expected last name: ${m.expected})`,
    );
  }
  console.log(
    '\nFix by updating NHL_IDS in scripts/fetch-headshots.ts with correct IDs from api-web.nhle.com.',
  );
  process.exitCode = 1;
}

main().catch(console.error);
