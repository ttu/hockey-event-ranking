#!/usr/bin/env npx tsx
/**
 * Validate all headshot URLs in roster JSON: HTTP reachable and no duplicate URLs.
 *
 * Usage:
 *   npx tsx scripts/validate-headshots.ts [competition-id]
 *   npx tsx scripts/validate-headshots.ts [competition-id] --fix   # Remove invalid/duplicate headshotUrl, then suggest fetch-headshots
 *
 * Without competition-id: validates all competitions.
 */

import * as fs from 'fs';
import * as path from 'path';

const COMPETITIONS_DIR = path.join(
  process.cwd(),
  'public',
  'data',
  'competitions',
);

interface Entry {
  compId: string;
  teamId: string;
  playerId: string;
  playerName: string;
  headshotUrl: string;
  filePath: string;
  playerIndex: number;
}

function collectEntries(compId?: string): Entry[] {
  const entries: Entry[] = [];
  const compIds: string[] = compId
    ? [compId]
    : fs
        .readdirSync(COMPETITIONS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
  for (const cid of compIds) {
    const dir = path.join(COMPETITIONS_DIR, cid);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json') && f !== 'overrides.json');
    for (const file of files) {
      const teamPath = path.join(dir, file);
      const teamId = path.basename(file, '.json');
      const data = JSON.parse(fs.readFileSync(teamPath, 'utf-8')) as {
        teamId?: string;
        players?: Array<{
          playerId?: string;
          playerName?: string;
          headshotUrl?: string;
        }>;
      };
      const players = data.players ?? [];
      players.forEach((p, i) => {
        if (p.headshotUrl) {
          entries.push({
            compId: cid,
            teamId,
            playerId: String(p.playerId ?? ''),
            playerName: String(p.playerName ?? ''),
            headshotUrl: p.headshotUrl,
            filePath: teamPath,
            playerIndex: i,
          });
        }
      });
    }
  }
  return entries;
}

async function checkUrl(
  url: string,
): Promise<{ ok: boolean; status?: number }> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false };
  }
}

function findDuplicates(entries: Entry[]): Map<string, Entry[]> {
  const byUrl = new Map<string, Entry[]>();
  for (const e of entries) {
    const list = byUrl.get(e.headshotUrl) ?? [];
    list.push(e);
    byUrl.set(e.headshotUrl, list);
  }
  const dupes = new Map<string, Entry[]>();
  for (const [url, list] of byUrl) {
    if (list.length > 1) dupes.set(url, list);
  }
  return dupes;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fix = args.includes('--fix');
  const compId = args.filter((a) => !a.startsWith('--'))[0];
  const entries = collectEntries(compId);
  if (entries.length === 0) {
    console.log('No headshot URLs found.');
    process.exit(0);
  }
  const uniqueUrls = [...new Set(entries.map((e) => e.headshotUrl))];
  const duplicates = findDuplicates(entries);
  const invalidUrls = new Set<string>();
  console.log(`Checking ${uniqueUrls.length} unique headshot URLs...\n`);
  for (const url of uniqueUrls) {
    const { ok, status } = await checkUrl(url);
    if (!ok) invalidUrls.add(url);
    if (!ok) console.log(`  FAIL ${status ?? 'error'} ${url}`);
    await new Promise((r) => setTimeout(r, 80));
  }
  if (duplicates.size > 0) {
    console.log('\nDuplicate headshot URLs (same URL for different players):');
    for (const [url, list] of duplicates) {
      console.log(`  ${url}`);
      for (const e of list)
        console.log(
          `    - ${e.compId}/${e.teamId} ${e.playerName} (${e.playerId})`,
        );
    }
  }
  const invalidEntries = entries.filter(
    (e) =>
      invalidUrls.has(e.headshotUrl) ||
      (duplicates.get(e.headshotUrl)?.length ?? 0) > 1,
  );
  const toFix = fix ? invalidEntries : [];
  if (toFix.length > 0 && fix) {
    const byPath = new Map<string, Entry[]>();
    for (const e of toFix)
      byPath.set(e.filePath, [...(byPath.get(e.filePath) ?? []), e]);
    for (const [filePath, list] of byPath) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as {
        players?: Array<Record<string, unknown>>;
      };
      const players = data.players ?? [];
      const indices = new Set(list.map((e) => e.playerIndex));
      for (let i = 0; i < players.length; i++) {
        if (indices.has(i) && players[i]?.headshotUrl) {
          delete (players[i] as Record<string, unknown>).headshotUrl;
        }
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(
        `\nRemoved ${list.length} invalid/duplicate headshot(s) from ${path.relative(process.cwd(), filePath)}`,
      );
    }
    console.log('\nRun for each competition to refill headshots:');
    const comps = [...new Set(toFix.map((e) => e.compId))];
    for (const c of comps)
      console.log(`  npx tsx scripts/fetch-headshots.ts ${c}`);
  }
  const summary = invalidUrls.size + (duplicates.size > 0 ? 1 : 0);
  if (summary > 0 && !fix) {
    console.log(
      '\nTotal: invalid URLs and/or duplicates. Re-run with --fix to remove them, then run fetch-headshots.',
    );
    process.exitCode = 1;
  } else if (summary === 0 && duplicates.size === 0) {
    console.log('All headshot URLs are valid and unique.');
  }
}

main().catch(console.error);
