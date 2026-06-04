#!/usr/bin/env bun
import { createStatementSdk, type TopicFilter } from '@novasamatech/sdk-statement';

import { connect } from './client.ts';
import { formatStatement } from './format.ts';

const USAGE = `stmt-cli — stream statements from the statement store

Usage:
  stmt-cli subscribe --rpc-endpoints=<ws,...> --topic=<0x..,...> [--match=all|any]

Options:
  --rpc-endpoints   Comma-separated WebSocket RPC endpoints (required).
  --topic           Comma-separated 32-byte topics in hex (required).
  --match           Topic match mode: "all" (default) or "any".
  -h, --help        Show this help.

Example:
  stmt-cli subscribe \\
    --rpc-endpoints=wss://your-rpc-endpoint:443 \\
    --topic=0x4157aa2f680a2d82d3b9b1b0284fe043b26d39c9ed698fd51fd53a258a7ea2b6
`;

type Flags = Record<string, string | boolean>;

function parseArgs(argv: string[]): { command?: string; flags: Flags } {
  const flags: Flags = {};
  let command: string | undefined;
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const [key, ...rest] = arg.slice(2).split('=');
      flags[key] = rest.length > 0 ? rest.join('=') : true;
    } else if (arg === '-h') {
      flags.help = true;
    } else if (!command) {
      command = arg;
    }
  }
  return { command, flags };
}

function list(flag: string | boolean | undefined): string[] {
  if (typeof flag !== 'string') return [];
  return flag
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function normalizeTopic(t: string): string {
  const hex = t.toLowerCase().startsWith('0x') ? t.slice(2) : t;
  if (hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(`--topic must be 32 bytes (64 hex chars), got: ${t}`);
  }
  return `0x${hex.toLowerCase()}`;
}

function buildFilter(topics: string[], match: string): TopicFilter {
  const normalized = topics.map(normalizeTopic);
  return match === 'any'
    ? ({ matchAny: normalized } as unknown as TopicFilter)
    : ({ matchAll: normalized } as unknown as TopicFilter);
}

async function runSubscribe(flags: Flags): Promise<void> {
  const endpoints = list(flags['rpc-endpoints']);
  const topics = list(flags.topic);
  const match = typeof flags.match === 'string' ? flags.match : 'all';

  if (endpoints.length === 0) throw new Error('--rpc-endpoints is required');
  if (topics.length === 0) throw new Error('--topic is required');
  if (match !== 'all' && match !== 'any') throw new Error('--match must be "all" or "any"');

  const filter = buildFilter(topics, match);
  const tagged = endpoints.length > 1;

  console.error(
    `[stmt-cli] subscribing: endpoints=${endpoints.length} match=${match} topics=${topics.map(normalizeTopic).join(',')}`,
  );

  const unsubs: Array<() => void> = [];
  const clients = endpoints.map(connect);

  for (const client of clients) {
    const sdk = createStatementSdk(client.request, client.subscribe);
    const prefix = tagged ? `[${client.endpoint}] ` : '';
    const unsub = sdk.subscribeStatements(
      filter,
      statement => {
        console.log(`${prefix}${formatStatement(statement)}`);
      },
      error => {
        console.error(`[stmt-cli] ${prefix}subscription error:`, error.message ?? error);
      },
    );
    unsubs.push(unsub);
  }

  const shutdown = () => {
    console.error('\n[stmt-cli] shutting down...');
    for (const u of unsubs) u();
    for (const c of clients) c.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.error('[stmt-cli] streaming... (Ctrl-C to stop)');
  // Keep the process alive; subscriptions drive output via callbacks.
  await new Promise<never>(() => {});
}

async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv.slice(2));

  if (flags.help || !command) {
    console.log(USAGE);
    process.exit(command ? 0 : flags.help ? 0 : 1);
  }

  switch (command) {
    case 'subscribe':
      await runSubscribe(flags);
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(USAGE);
      process.exit(1);
  }
}

main().catch(err => {
  console.error(`[stmt-cli] error: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
