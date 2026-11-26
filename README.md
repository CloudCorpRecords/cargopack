# cargopack

Work out how freight actually fits before you book the container. cargopack is a small forwarding client for the hosted Kubova container-loading service: the tool list is answered from your own machine using captured definitions, and each call travels upstream, with the service's answer handed back exactly as it arrived.

All four of the service's captured tools are exposed. Pack a list of cargo SKUs into one or more shipping containers and get back per-container placements with coordinates, volume utilisation, weight and a weight-balance reading; generate a CAD-style PDF and 3D PNG report for a packing job, rendering an earlier packing plan verbatim when you pass its result in; estimate how many complete sets of a multi-carton product fit in a single container; and verify the connection to read back the account identity and plan bound to it.

## The tools

- **`pack_containers`** — Pack the `cargos` list into shipping containers with the solver. Bulk loading puts cartons straight into the container; pallet loading (`loadingMode: "pallet"` with a `pallet` definition) stacks cartons onto pallets first. Per-SKU orientations, stacking limits and loading order are honoured. Returns placements with x, y, z coordinates in centimetres, utilisation, weight, a `weightBalance` object for bulk loads, and any unplaced pieces.
- **`generate_report`** — A CAD-style PDF plus 3D PNG report for a packing job, returned base64-encoded per container. Pass the `result` object from an earlier `pack_containers` call so the report renders that exact plan instead of recomputing one.
- **`estimate_capacity`** — How many complete sets of one `product` fit in a single container. A product is one or more carton types with a quantity per set, and every carton of a set rides in the same container. Uses real 3D packing and reports the binding limit per container. Omit `containers` to evaluate the standard 20' DC, 40' DC and 40' HC.
- **`verify_key`** — Verify the connection. Returns the authenticated account identity and plan bound to the existing connection. Takes no arguments.

## Install and run

As an MCP server via npm:

```bash
npx -y @reneturcios/cargopack mcp
```

MCP client configuration:

```json
{
  "mcpServers": {
    "cargopack": {
      "command": "npx",
      "args": ["-y", "@reneturcios/cargopack", "mcp"]
    }
  }
}
```

As a container:

```bash
docker run -i ghcr.io/cloudcorprecords/cargopack
docker run --rm ghcr.io/cloudcorprecords/cargopack verify_key '{}'
```

## CLI

A single binary covers both the command line and the MCP server. Every tool is a subcommand whose one argument is a JSON string of that tool's inputs:

```bash
cargopack pack_containers '{"cargos":[{"id":"a","name":"Box","lengthCm":60,"widthCm":40,"heightCm":40,"quantity":10,"weightKg":5}]}'
cargopack generate_report '{"cargos":[{"id":"a","name":"Box","lengthCm":60,"widthCm":40,"heightCm":40,"quantity":10,"weightKg":5}]}'
cargopack estimate_capacity '{"product":{"name":"Table","cartons":[{"name":"Top","lengthCm":120,"widthCm":80,"heightCm":5,"weightKg":12}]}}'
cargopack verify_key '{}'
cargopack --version
```

Exit codes: `0` for a successful forwarded call, `1` when the result that comes back is an error, and `2` for usage mistakes like an unknown subcommand or a JSON argument that does not parse.

## Configuration

- `KUBOVA_MCP_URL` — Replaces the upstream endpoint. Defaults to the pinned hosted endpoint, `https://kubova.com/mcp`. (This override variable is a reconstruction introduced by this rebuild.)

The Kubova registry record lists no headers for its remote, so cargopack never attaches an authentication header — every call goes upstream keyless.

When the upstream cannot answer — it returns a JSON-RPC error, answers with a non-2xx status, sends a body that cannot be read, or the request itself fails — the caller receives an error result whose text begins with `cargopack error:`.

## How forwarding works

The first call of a process opens a session against the upstream: an `initialize` request (protocol version `2025-03-26`), a `notifications/initialized` notification, and then the `tools/call`. If the service issues an `Mcp-Session-Id` header during initialize, cargopack repeats it on subsequent requests and keeps reusing that one session until the process ends. Replies are understood in both plain JSON and server-sent-events framing. Successful results are passed through untouched, `isError` flag and any extra fields included.

## Development

```bash
npm install
npm run build   # tsc -> dist/ (dist/cli.js is the bin)
npm test        # tsx --test test/*.test.ts — stubbed upstream, no network
npm run dev     # run the CLI from source
```

The suite compares the served tool list against the captured surface tool for tool, walks the session handshake and its reuse, proves no `Authorization` header is sent under any environment, and confirms that arguments travel upstream unchanged and results return unchanged for every one of the four tools.

## License

MIT — see `LICENSE`. Copyright (c) 2026 Rene Turcios.
