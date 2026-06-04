# stmt-cli

A small [Bun](https://bun.sh) CLI that streams statements from a Polkadot
statement store over RPC and prints each decoded statement as JSON.

It is a thin wrapper over [`@novasamatech/sdk-statement`](https://www.npmjs.com/package/@novasamatech/sdk-statement)
and `polkadot-api`'s WebSocket provider.

## Install

```bash
bun install
bun link          # exposes `stmt-cli` on your PATH (via ~/.bun/bin)
```

Or run it directly without linking:

```bash
bun run src/index.ts subscribe --rpc-endpoints=... --topic=...
```

## Usage

```bash
stmt-cli subscribe \
  --rpc-endpoints=wss://your-rpc-endpoint:443 \
  --topic=0x4157aa2f680a2d82d3b9b1b0284fe043b26d39c9ed698fd51fd53a258a7ea2b6
```

Each matching statement is printed as pretty JSON to stdout (diagnostics go to
stderr, so you can pipe stdout into `jq`):

```json
{
  "account": "0xcebe347bc199f0ea38d9b44fbf932f8ae02da4a8cb1b848ab45850b3d1845a15",
  "proofType": "sr25519",
  "expiry": "7647904966698336256",
  "expiryTimestamp": 1780666636,
  "expiryDate": "2026-06-05T13:37:16.000Z",
  "expirySequence": 0,
  "topics": ["0x4157aa2f680a2d82d3b9b1b0284fe043b26d39c9ed698fd51fd53a258a7ea2b6"],
  "encrypted": false,
  "dataLen": 4,
  "data": "0xdeadbeef"
}
```

### Options

| Flag              | Description                                                        |
| ----------------- | ------------------------------------------------------------------ |
| `--rpc-endpoints` | Comma-separated WebSocket RPC endpoints (required).                |
| `--topic`         | Comma-separated 32-byte topics in hex (required).                  |
| `--match`         | `all` (default) requires every topic; `any` matches any topic.     |
| `-h`, `--help`    | Show help.                                                         |

Notes:

- Statements carrying printable UTF-8 payloads also get a `dataText` field.
- Multiple `--rpc-endpoints` open one subscription each; output lines are
  prefixed with the endpoint.
- Press Ctrl-C to unsubscribe and disconnect cleanly.
