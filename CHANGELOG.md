# Changelog

## 0.1.0 (2026-10-28)

- First release: a forwarding client for the hosted Kubova container-loading MCP server. All four captured tools are answered locally for tools/list, and every tools/call is forwarded upstream over a streamable-HTTP JSON-RPC session (initialize, notifications/initialized, tools/call, honouring the Mcp-Session-Id header when the upstream issues one).
- Tools: `pack_containers`, `generate_report`, `estimate_capacity`, `verify_key` — 3D packing of cargo SKUs into shipping containers with placements and weight balance, CAD-style PDF and 3D PNG report generation for a packing job, capacity estimation for complete product sets, and a connection check that returns the authenticated account identity and plan bound to the existing connection.
- Upstream results pass through verbatim, including the isError flag; upstream failures surface as `cargopack error:` text results.
- One bin serves the CLI (one subcommand per tool, plus `--version`) and the stdio MCP server (`mcp` subcommand). The upstream endpoint can be overridden via `KUBOVA_MCP_URL`. The registry record declares no headers on the remote, so no auth header is ever sent.
