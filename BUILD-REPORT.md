# BUILD REPORT — cargopack

Clean-room rebuild of `com.kubova/container-loading` v1.0.0
(remote-only MCP server at `https://kubova.com/mcp`),
built 2026-10-28 as a forwarding client. Package: `@reneturcios/cargopack`
0.1.0, registry name `io.github.CloudCorpRecords/cargopack`.

## Surface built

**FULL surface: all 4 captured tools built**, none omitted.

| Tool | Required fields as served |
|------|---------------------------|
| `pack_containers` | `cargos` |
| `generate_report` | `cargos` |
| `estimate_capacity` | `product` |
| `verify_key` | *(none — no `required` key in the capture, served verbatim)* |

Each served tool carries exactly the keys `name`,
`description`, `inputSchema` — the capture carries NO
`title` key, so the fixture carries none and none is
served. `pack_containers`, `generate_report` and
`estimate_capacity` carry `additionalProperties: false`
and the `inputSchema.$schema` marker
(`http://json-schema.org/draft-07/schema#`) exactly as
captured; `verify_key` carries no `additionalProperties`
key and no `required` key — none was captured, none was
invented. Property shapes are served verbatim, including
`pack_containers`' `cargos` (array, 1..500 items, item
required fields `id`, `name`, `lengthCm`, `widthCm`,
`heightCm`, `quantity`, `weightKg`), its `loadingMode`
enum (`bulk`, `pallet`), `generate_report`'s optional
`result` object for rendering a prior plan, and
`estimate_capacity`'s `product` (required `cartons`).
The tool literals were generated programmatically from
`harness/fixtures/kubova-tools-original.json` by the
script at `/tmp/laneb8-cargopack-scratch/gen.py`
(parse + re-serialise, spliced into `src/forward.ts`
between the TOOL_DEFS_GENERATED markers) — never
retyped — and the generator's round-trip check confirmed
the spliced block parses back deep-equal to the
fixture's 4 tool objects, in order. Tools are
registered via the MCP SDK low-level Server API
(`ListToolsRequestSchema` / `CallToolRequestSchema`
handlers), not McpServer+zod.

The surface is a 3D container-packing solver over
caller-supplied cargo data: pack cartons/pallets into
containers with placements, utilisation, weight balance
and unplaced pieces; a CAD-style PDF + 3D PNG report
for a packing job (rendering a prior `pack_containers`
result verbatim when passed); and a capacity estimate
for product sets. All compute-only over the caller's
own cargo figures: no sends, no orders, no payments.

**verify_key judgment (from the spec, recorded for the
publish gate):** `verify_key` is KEPT verbatim. Its
captured description is "Verify the connection. Returns
the authenticated account identity and plan." It binds
to the connection's EXISTING key/context, creates no
credential, returns no key material, sends nothing and
screens no one — the register distinction
(bind-to-existing = not minting). It is the caller's
own connection read.

## Fixture conflicts

**None.** The spec and the fixture agree on the tools'
names, descriptions, the `required` arrays (`cargos`;
`cargos`; `product`; and none for `verify_key`), the
absence of any `title` key, and the property shapes.

## Labelled reconstructions (from the spec's Wire section)

- Upstream endpoint pinned: `https://kubova.com/mcp`.
- Env override `KUBOVA_MCP_URL` — labelled reconstruction.
- The registry record declares NO headers on the remote: no auth
  header is ever sent, under any environment. Tests assert that no
  `Authorization` header (and no `X-API-Key` header) is sent with an
  empty environment, with a `KUBOVA_API_KEY`-style variable
  present, and with `AUTHORIZATION` / `API_KEY` /
  `KUBOVA_TOKEN` variables present.
- Error rendering `cargopack error:` text for upstream failures
  — labelled reconstruction.
- Upstream results pass through verbatim, including `isError` and
  extra fields. tools/call is forwarded as streamable-HTTP JSON-RPC:
  initialize (protocolVersion `2025-03-26`) →
  notifications/initialized → tools/call, honouring `Mcp-Session-Id`
  when issued; plain-JSON and SSE replies are both parsed. The
  forwarding core takes an injectable fetch; tests stub the
  upstream — no live network calls in tests, and no live call is
  claimed beyond the coordinator's tools/list capture.

## Deviations

**None.** No write-guard workaround was needed in this session:
the lockfile, `npm ci`, `tsc` build and test suite all ran
through the normal routes (direct `node_modules/.bin/tsc` /
`tsx` binaries), and `dist/` is the direct output of
`tsc` on the validated sources.

## Lockfile

Generated clean from birth (Route 3, clean dir, no
`node_modules`, no pre-existing lockfile):
`npm install --package-lock-only --ignore-scripts --offline`
→ success. Parses as JSON; `name` == `@reneturcios/cargopack`;
exactly **128** package entries; sha256
`1f9c2bc991f71532fa503d59a803e77db3cfb711109def10c937c9335f0f4d9c`.
`npm ci --ignore-scripts --offline` then succeeded and the
lockfile sha256 was re-verified **unchanged** afterwards.

## server.json

- Description exactly: "3D container packing: pack cargo, estimate set capacity, generate packing reports." — **82 characters**.
- npm package entry carries `"version": "0.1.0"`; the OCI entry
  (`ghcr.io/cloudcorprecords/cargopack:0.1.0`) carries **no**
  `version` field. Both entries carry packageArguments
  `[{type: positional, value: mcp}]` and transport stdio. Dockerfile
  (node:20-alpine, both stages) carries the label
  `io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/cargopack"`.
  Container workflow `IMAGE` is `ghcr.io/cloudcorprecords/cargopack`
  and its smoke test asserts the server name `cargopack`.

## Verification (run 2026-10-28, builder session)

1. `npm install --package-lock-only --ignore-scripts --offline`
   → success; lockfile parses, name `@reneturcios/cargopack`,
   128 package entries (see Lockfile).
2. `npm ci --ignore-scripts --offline` → success; lockfile
   sha256 unchanged.
3. `tsc --noEmit` (direct `node_modules/.bin/tsc`) → exit 0.
4. `tsc` build → exit 0; `node dist/cli.js --version` → `0.1.0`.
5. Full suite (`tsx --test test/*.test.ts`, direct
   `node_modules/.bin/tsx`) → **65 tests,
   65 pass, 0 fail** (registration-integrity suite deep-equals
   the served tools/list against the fixture's 4 tools, in
   order, at both the registry level and through an
   in-memory-transport MCP `tools/list`; plus per-tool schema
   detail assertions including the no-title check, session
   handling/reuse, env override, the no-Authorization-header
   assertions under every environment, verbatim argument
   forwarding for all 4 tools and result pass-through
   including upstream isError, SSE parsing, error rendering,
   MCP-layer validation, and CLI behaviour).
6. Parity (harness, tools-file mode):
   `python3 /home/hatch/workspace/mcp-rebuild-100/harness/parity.py --original /home/hatch/workspace/mcp-rebuild-100/harness/fixtures/kubova-tools-original.json --rebuild "stdio:node /home/hatch/workspace/mcp-rebuild-100/builds/cargopack/dist/cli.js mcp" --out /home/hatch/workspace/mcp-rebuild-100/builds/cargopack/parity-out/`
   → **verdict PASS, parity 100.0** (4/4 identical, 0 missing,
   0 extra, no schema diffs). Output in `parity-out/`.
