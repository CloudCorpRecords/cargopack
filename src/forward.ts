/**
 * cargopack core: a forwarding client for the hosted
 * Kubova container-loading MCP server.
 *
 * No packing computation happens on this machine.
 * tools/list is answered from the literal definitions
 * below, which reproduce a live capture of the upstream
 * server word for word (name, description and
 * inputSchema exactly as captured; the capture carries
 * no title key, so none is served). A tools/call
 * travels upstream over a streamable-HTTP JSON-RPC
 * session: an initialize POST, a
 * notifications/initialized POST, then the tools/call
 * POST, carrying the Mcp-Session-Id response header on
 * later requests when the upstream issues one. The
 * session opens lazily on the first forwarded call and
 * is reused for the client's lifetime.
 *
 * The full captured surface is registered: all 4 tools.
 * The surface is a 3D container-packing solver over
 * caller-supplied cargo data: pack cartons or pallets
 * into containers, render a CAD-style PDF + 3D PNG
 * report for a packing job, estimate how many complete
 * sets of a product fit in one container, and verify
 * the connection. verify_key binds to the connection's
 * existing key/context: it creates no credential,
 * returns no key material, and reads back the
 * authenticated account identity and plan for the
 * caller's own connection.
 *
 * The endpoint is pinned to https://kubova.com/mcp
 * and may be replaced with the KUBOVA_MCP_URL
 * environment variable (that override is a labelled
 * reconstruction). The registry record declares NO
 * headers on the remote: no auth header is ever sent,
 * under any environment.
 *
 * A successful upstream result is returned exactly as
 * received, isError flag and extra fields included.
 * Failures — an upstream JSON-RPC error, a non-2xx
 * status, a body that cannot be parsed, or a fetch that
 * throws or times out — become an isError result whose
 * text begins with `cargopack error:` (that rendering
 * is a labelled reconstruction). Replies may be plain
 * JSON or SSE (`data:` lines); the JSON-RPC message
 * whose id matches the request wins.
 */
import type {
  FetchFn,
  FetchResponseLike,
  ForwardDeps,
  ToolArgs,
  ToolDef,
  ToolResult,
} from "./types.js";

export const VERSION = "0.1.0";

export const DEFAULT_ENDPOINT_URL = "https://kubova.com/mcp";

export const DEFAULT_TIMEOUT_MS = 30000;

export const PROTOCOL_VERSION = "2025-03-26";

/* ------------------------------------------------------------------ */
/* Tool definitions (tools/list literals, verbatim from the live       */
/* capture in harness/fixtures/kubova-tools-original.json;             */
/* generated programmatically by parsing and re-serialising the        */
/* fixture JSON, never retyped)                                        */
/* ------------------------------------------------------------------ */

// TOOL_DEFS_GENERATED_START
export const TOOL_DEFS: ToolDef[] = [
  {
    "name": "pack_containers",
    "description": "Pack a list of cargo SKUs into one or more shipping containers using the Kubova solver. Supports bulk loading (cartons straight into the container) and pallet loading (loadingMode:\"pallet\" + a pallet — cartons are stacked onto pallets first, then the pallets loaded). Per-SKU you can set allowed orientations, no-overstack/no-understack, and loading order. Returns per-container placements with x,y,z coordinates in cm, volume utilization, weight, a weightBalance object (centre of gravity + front/back & left/right weight split, flags an unbalanced load) for bulk loads, and any unplaced pieces.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "cargos": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "maxLength": 200
              },
              "name": {
                "type": "string",
                "maxLength": 200
              },
              "shape": {
                "type": "string",
                "enum": [
                  "box",
                  "cylinder"
                ],
                "default": "box"
              },
              "lengthCm": {
                "type": "number",
                "exclusiveMinimum": 0,
                "maximum": 5000
              },
              "widthCm": {
                "type": "number",
                "exclusiveMinimum": 0,
                "maximum": 5000
              },
              "heightCm": {
                "type": "number",
                "exclusiveMinimum": 0,
                "maximum": 5000
              },
              "diameterCm": {
                "type": "number",
                "exclusiveMinimum": 0,
                "maximum": 5000
              },
              "quantity": {
                "type": "integer",
                "exclusiveMinimum": 0,
                "maximum": 1000000,
                "description": "Number of identical pieces of this SKU."
              },
              "weightKg": {
                "type": "number",
                "minimum": 0,
                "description": "Weight of ONE piece in kg — NOT the row total. If a packing list shows both \"weight/piece\" and \"weight total\", use weight/piece (total = quantity × weightKg)."
              },
              "color": {
                "type": "string",
                "default": "#3b82f6"
              },
              "includeInLoading": {
                "type": "boolean",
                "default": true
              },
              "allowStacking": {
                "type": "boolean",
                "default": true
              },
              "allowRotation": {
                "type": "boolean",
                "default": true
              },
              "orientations": {
                "type": "array",
                "items": {
                  "type": "string",
                  "enum": [
                    "standard-0",
                    "standard-90",
                    "turnup-0",
                    "turnup-90",
                    "turnside-0",
                    "turnside-90"
                  ]
                },
                "description": "Explicit allowed-pose subset; overrides allowRotation when set. standard = upright, turnup/turnside = tipped onto a face; 0/90 = yaw."
              },
              "noOverstack": {
                "type": "boolean",
                "description": "Nothing may rest on top of this SKU."
              },
              "noUnderstack": {
                "type": "boolean",
                "description": "Floor only — this SKU may not sit on other pieces."
              },
              "loadingOrder": {
                "type": "string",
                "enum": [
                  "optimized",
                  "rear",
                  "door"
                ],
                "description": "Placement priority: rear = deepest (unloaded last), door = closest to the door (unloaded first)."
              }
            },
            "required": [
              "id",
              "name",
              "lengthCm",
              "widthCm",
              "heightCm",
              "quantity",
              "weightKg"
            ],
            "additionalProperties": false
          },
          "minItems": 1,
          "maxItems": 500
        },
        "container": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "maxLength": 200
            },
            "name": {
              "type": "string",
              "maxLength": 200
            },
            "innerLengthCm": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 5000
            },
            "innerWidthCm": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 5000
            },
            "innerHeightCm": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 5000
            },
            "doorWidthCm": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 5000
            },
            "doorHeightCm": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 5000
            },
            "maxPayloadKg": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 1000000000
            }
          },
          "required": [
            "id",
            "name",
            "innerLengthCm",
            "innerWidthCm",
            "innerHeightCm",
            "doorWidthCm",
            "doorHeightCm",
            "maxPayloadKg"
          ],
          "additionalProperties": false
        },
        "containers": {
          "type": "array",
          "items": {
            "$ref": "#/properties/container"
          },
          "maxItems": 20
        },
        "loadingMode": {
          "type": "string",
          "enum": [
            "bulk",
            "pallet"
          ],
          "description": "'bulk' (default) loads cartons straight into the container. 'pallet' first stacks cartons onto pallets, then loads the pallets — requires the `pallet` field."
        },
        "pallet": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "maxLength": 200
            },
            "name": {
              "type": "string",
              "maxLength": 200
            },
            "lengthCm": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 5000,
              "description": "Pallet footprint length (cm)."
            },
            "widthCm": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 5000,
              "description": "Pallet footprint width (cm)."
            },
            "baseHeightCm": {
              "type": "number",
              "minimum": 0,
              "maximum": 5000,
              "description": "Pallet base self-height (cm), added below the cargo stack."
            },
            "maxStackHeightCm": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 5000,
              "description": "Max cargo stack height ON the pallet (cm), excluding the base."
            },
            "maxPayloadKg": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 1000000,
              "description": "Max cargo weight per pallet (kg)."
            },
            "tareWeightKg": {
              "type": "number",
              "minimum": 0,
              "maximum": 1000000,
              "description": "Pallet self-weight (kg), added to container payload."
            }
          },
          "required": [
            "id",
            "name",
            "lengthCm",
            "widthCm",
            "baseHeightCm",
            "maxStackHeightCm",
            "maxPayloadKg",
            "tareWeightKg"
          ],
          "additionalProperties": false,
          "description": "The pallet to stack onto. Required when loadingMode is \"pallet\"."
        },
        "options": {
          "type": "object",
          "properties": {
            "loadingDirection": {
              "type": "string",
              "enum": [
                "floor-to-top",
                "right-to-left"
              ]
            },
            "maxContainers": {
              "type": "integer",
              "exclusiveMinimum": 0,
              "maximum": 1000
            },
            "deepOptimize": {
              "type": "boolean",
              "description": "Pallet mode only: run the exact optimizer for a tighter pallet plan (slower; Pro/Team plans)."
            }
          },
          "additionalProperties": false
        }
      },
      "required": [
        "cargos"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "generate_report",
    "description": "Generate a CAD-style PDF + 3D PNG report for a packing job. IMPORTANT: to keep the report consistent with a plan you already produced, pass the `result` object from your previous pack_containers call — the report then renders that exact plan instead of recomputing. Returns base64-encoded PDF + PNG per container.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "cargos": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "maxLength": 200
              },
              "name": {
                "type": "string",
                "maxLength": 200
              },
              "shape": {
                "type": "string",
                "enum": [
                  "box",
                  "cylinder"
                ],
                "default": "box"
              },
              "lengthCm": {
                "type": "number",
                "exclusiveMinimum": 0,
                "maximum": 5000
              },
              "widthCm": {
                "type": "number",
                "exclusiveMinimum": 0,
                "maximum": 5000
              },
              "heightCm": {
                "type": "number",
                "exclusiveMinimum": 0,
                "maximum": 5000
              },
              "diameterCm": {
                "type": "number",
                "exclusiveMinimum": 0,
                "maximum": 5000
              },
              "quantity": {
                "type": "integer",
                "exclusiveMinimum": 0,
                "maximum": 1000000,
                "description": "Number of identical pieces of this SKU."
              },
              "weightKg": {
                "type": "number",
                "minimum": 0,
                "description": "Weight of ONE piece in kg — NOT the row total. If a packing list shows both \"weight/piece\" and \"weight total\", use weight/piece (total = quantity × weightKg)."
              },
              "color": {
                "type": "string",
                "default": "#3b82f6"
              },
              "includeInLoading": {
                "type": "boolean",
                "default": true
              },
              "allowStacking": {
                "type": "boolean",
                "default": true
              },
              "allowRotation": {
                "type": "boolean",
                "default": true
              },
              "orientations": {
                "type": "array",
                "items": {
                  "type": "string",
                  "enum": [
                    "standard-0",
                    "standard-90",
                    "turnup-0",
                    "turnup-90",
                    "turnside-0",
                    "turnside-90"
                  ]
                },
                "description": "Explicit allowed-pose subset; overrides allowRotation when set. standard = upright, turnup/turnside = tipped onto a face; 0/90 = yaw."
              },
              "noOverstack": {
                "type": "boolean",
                "description": "Nothing may rest on top of this SKU."
              },
              "noUnderstack": {
                "type": "boolean",
                "description": "Floor only — this SKU may not sit on other pieces."
              },
              "loadingOrder": {
                "type": "string",
                "enum": [
                  "optimized",
                  "rear",
                  "door"
                ],
                "description": "Placement priority: rear = deepest (unloaded last), door = closest to the door (unloaded first)."
              }
            },
            "required": [
              "id",
              "name",
              "lengthCm",
              "widthCm",
              "heightCm",
              "quantity",
              "weightKg"
            ],
            "additionalProperties": false
          },
          "minItems": 1,
          "maxItems": 500
        },
        "container": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "maxLength": 200
            },
            "name": {
              "type": "string",
              "maxLength": 200
            },
            "innerLengthCm": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 5000
            },
            "innerWidthCm": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 5000
            },
            "innerHeightCm": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 5000
            },
            "doorWidthCm": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 5000
            },
            "doorHeightCm": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 5000
            },
            "maxPayloadKg": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 1000000000
            }
          },
          "required": [
            "id",
            "name",
            "innerLengthCm",
            "innerWidthCm",
            "innerHeightCm",
            "doorWidthCm",
            "doorHeightCm",
            "maxPayloadKg"
          ],
          "additionalProperties": false
        },
        "containers": {
          "type": "array",
          "items": {
            "$ref": "#/properties/container"
          },
          "maxItems": 20
        },
        "loadingMode": {
          "type": "string",
          "enum": [
            "bulk",
            "pallet"
          ],
          "description": "'bulk' (default) loads cartons straight into the container. 'pallet' first stacks cartons onto pallets, then loads the pallets — requires the `pallet` field."
        },
        "pallet": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "maxLength": 200
            },
            "name": {
              "type": "string",
              "maxLength": 200
            },
            "lengthCm": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 5000,
              "description": "Pallet footprint length (cm)."
            },
            "widthCm": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 5000,
              "description": "Pallet footprint width (cm)."
            },
            "baseHeightCm": {
              "type": "number",
              "minimum": 0,
              "maximum": 5000,
              "description": "Pallet base self-height (cm), added below the cargo stack."
            },
            "maxStackHeightCm": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 5000,
              "description": "Max cargo stack height ON the pallet (cm), excluding the base."
            },
            "maxPayloadKg": {
              "type": "number",
              "exclusiveMinimum": 0,
              "maximum": 1000000,
              "description": "Max cargo weight per pallet (kg)."
            },
            "tareWeightKg": {
              "type": "number",
              "minimum": 0,
              "maximum": 1000000,
              "description": "Pallet self-weight (kg), added to container payload."
            }
          },
          "required": [
            "id",
            "name",
            "lengthCm",
            "widthCm",
            "baseHeightCm",
            "maxStackHeightCm",
            "maxPayloadKg",
            "tareWeightKg"
          ],
          "additionalProperties": false,
          "description": "The pallet to stack onto. Required when loadingMode is \"pallet\"."
        },
        "options": {
          "type": "object",
          "properties": {
            "loadingDirection": {
              "type": "string",
              "enum": [
                "floor-to-top",
                "right-to-left"
              ]
            },
            "maxContainers": {
              "type": "integer",
              "exclusiveMinimum": 0,
              "maximum": 1000
            },
            "deepOptimize": {
              "type": "boolean",
              "description": "Pallet mode only: run the exact optimizer for a tighter pallet plan (slower; Pro/Team plans)."
            }
          },
          "additionalProperties": false
        },
        "result": {
          "type": "object",
          "additionalProperties": {},
          "description": "OPTIONAL but strongly recommended: the exact `result` object returned by a prior pack_containers call, so the report renders THAT plan instead of repacking."
        }
      },
      "required": [
        "cargos"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "estimate_capacity",
    "description": "How many complete SETS of one product fit in a single container? A product is 1+ carton types with qtyPerSet each (e.g. a table shipping as 2 cartons: top + legs). All cartons of a set ride in the SAME container. Uses real 3D packing (not just volume math) and reports the binding limit (dimension / weight / volume) per container. Omit `containers` to evaluate the standard 20' DC, 40' DC and 40' HC.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "product": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "maxLength": 200
            },
            "cartons": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string",
                    "maxLength": 200
                  },
                  "lengthCm": {
                    "type": "number",
                    "exclusiveMinimum": 0,
                    "maximum": 5000
                  },
                  "widthCm": {
                    "type": "number",
                    "exclusiveMinimum": 0,
                    "maximum": 5000
                  },
                  "heightCm": {
                    "type": "number",
                    "exclusiveMinimum": 0,
                    "maximum": 5000
                  },
                  "weightKg": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1000000
                  },
                  "qtyPerSet": {
                    "type": "integer",
                    "exclusiveMinimum": 0,
                    "maximum": 1000000,
                    "default": 1,
                    "description": "How many of THIS carton make up one set/product. Default 1."
                  },
                  "allowRotation": {
                    "type": "boolean",
                    "default": true
                  },
                  "allowStacking": {
                    "type": "boolean",
                    "default": true
                  }
                },
                "required": [
                  "name",
                  "lengthCm",
                  "widthCm",
                  "heightCm",
                  "weightKg"
                ],
                "additionalProperties": false
              },
              "minItems": 1,
              "maxItems": 500
            }
          },
          "required": [
            "cartons"
          ],
          "additionalProperties": false
        },
        "containers": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "maxLength": 200
              },
              "name": {
                "type": "string",
                "maxLength": 200
              },
              "innerLengthCm": {
                "type": "number",
                "exclusiveMinimum": 0,
                "maximum": 5000
              },
              "innerWidthCm": {
                "type": "number",
                "exclusiveMinimum": 0,
                "maximum": 5000
              },
              "innerHeightCm": {
                "type": "number",
                "exclusiveMinimum": 0,
                "maximum": 5000
              },
              "doorWidthCm": {
                "type": "number",
                "exclusiveMinimum": 0,
                "maximum": 5000
              },
              "doorHeightCm": {
                "type": "number",
                "exclusiveMinimum": 0,
                "maximum": 5000
              },
              "maxPayloadKg": {
                "type": "number",
                "exclusiveMinimum": 0,
                "maximum": 1000000000
              }
            },
            "required": [
              "id",
              "name",
              "innerLengthCm",
              "innerWidthCm",
              "innerHeightCm",
              "doorWidthCm",
              "doorHeightCm",
              "maxPayloadKg"
            ],
            "additionalProperties": false
          },
          "maxItems": 20,
          "description": "Containers to evaluate. Omit to use the standard catalogue (20' DC, 40' DC, 40' HC)."
        }
      },
      "required": [
        "product"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "verify_key",
    "description": "Verify the connection. Returns the authenticated account identity and plan.",
    "inputSchema": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {}
    }
  }
];
// TOOL_DEFS_GENERATED_END

export const TOOL_NAMES = TOOL_DEFS.map((t) => t.name);

/** Whether `name` belongs to the captured surface. */
export function isKnownTool(name: string): boolean {
  return TOOL_NAMES.includes(name);
}

/* ------------------------------------------------------------------ */
/* Forwarding client                                                   */
/* ------------------------------------------------------------------ */

function errorResult(detail: string): ToolResult {
  return {
    content: [{ type: "text", text: `cargopack error: ${detail}` }],
    isError: true,
  };
}

function rpcErrorMessage(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message !== "") return message;
    return JSON.stringify(error);
  }
  return String(error);
}

/**
 * Read a JSON-RPC response body, tolerating SSE framing.
 * Returns the message whose id matches `expectedId` when
 * present, otherwise the last parseable message, otherwise
 * null when nothing in the body parses.
 */
export function parseRpcBody(
  text: string,
  expectedId?: number,
): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const candidates: Record<string, unknown>[] = [];
  const tryPush = (payload: string): void => {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        candidates.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Not a JSON payload; skip this candidate.
    }
  };
  if (trimmed.includes("data:")) {
    for (const line of trimmed.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice("data:".length).trim();
      if (payload !== "" && payload !== "[DONE]") tryPush(payload);
    }
  } else {
    tryPush(trimmed);
  }
  if (candidates.length === 0) return null;
  if (expectedId !== undefined) {
    const match = candidates.find((c) => c.id === expectedId);
    if (match !== undefined) return match;
  }
  return candidates[candidates.length - 1];
}

async function defaultFetch(
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
): Promise<FetchResponseLike> {
  return fetch(url, init) as unknown as FetchResponseLike;
}

/**
 * A forwarding client holding a single upstream session,
 * opened lazily on first use and reused from then on
 * (for the process lifetime in the MCP server, or for a
 * single invocation in the CLI).
 */
export class CargopackClient {
  private readonly deps: ForwardDeps;
  private sessionId: string | null = null;
  private ready = false;
  private sessionPromise: Promise<void> | null = null;
  private idCounter = 0;

  constructor(deps: ForwardDeps = {}) {
    this.deps = deps;
  }

  private fetchFn(): FetchFn {
    return this.deps.fetchFn ?? defaultFetch;
  }

  private endpointUrl(): string {
    if (this.deps.url && this.deps.url.trim() !== "") return this.deps.url.trim();
    const raw = (this.deps.env ?? process.env).KUBOVA_MCP_URL;
    if (raw && raw.trim() !== "") return raw.trim();
    return DEFAULT_ENDPOINT_URL;
  }

  private timeoutMs(): number {
    if (typeof this.deps.timeoutMs === "number" && this.deps.timeoutMs > 0) {
      return this.deps.timeoutMs;
    }
    return DEFAULT_TIMEOUT_MS;
  }

  private nextId(): number {
    this.idCounter += 1;
    return this.idCounter;
  }

  private async post(
    body: unknown,
    withSession: boolean,
  ): Promise<FetchResponseLike> {
    // The registry record declares NO headers on the remote:
    // no Authorization (or any other auth) header is ever sent.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (withSession && this.sessionId !== null) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      return await this.fetchFn()(this.endpointUrl(), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async ensureSession(): Promise<void> {
    if (this.ready) return;
    if (this.sessionPromise === null) {
      this.sessionPromise = (async () => {
        const initId = this.nextId();
        const initRes = await this.post(
          {
            jsonrpc: "2.0",
            id: initId,
            method: "initialize",
            params: {
              protocolVersion: PROTOCOL_VERSION,
              capabilities: {},
              clientInfo: { name: "cargopack", version: VERSION },
            },
          },
          false,
        );
        const sessionId = initRes.headers.get("mcp-session-id");
        if (sessionId) this.sessionId = sessionId;
        const initText = await initRes.text();
        const initParsed = parseRpcBody(initText, initId);
        if (initParsed !== null && initParsed.error) {
          throw new Error(rpcErrorMessage(initParsed.error));
        }
        if (initRes.status < 200 || initRes.status >= 300) {
          throw new Error(`HTTP ${initRes.status}`);
        }
        if (initParsed === null && initText.trim() !== "") {
          throw new Error("malformed response");
        }
        const initializedRes = await this.post(
          { jsonrpc: "2.0", method: "notifications/initialized" },
          true,
        );
        try {
          await initializedRes.text();
        } catch {
          // Nothing needed from the notification response body.
        }
        this.ready = true;
      })();
    }
    try {
      await this.sessionPromise;
    } catch (err) {
      this.sessionPromise = null;
      this.sessionId = null;
      throw err;
    }
  }

  /** Forward one tool call; upstream failures come back as isError results. */
  async callTool(name: string, args: ToolArgs): Promise<ToolResult> {
    try {
      await this.ensureSession();
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }

    const callId = this.nextId();
    let callRes: FetchResponseLike;
    try {
      callRes = await this.post(
        {
          jsonrpc: "2.0",
          id: callId,
          method: "tools/call",
          params: { name, arguments: args ?? {} },
        },
        true,
      );
    } catch (err) {
      return errorResult(
        `request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const parsed = parseRpcBody(await callRes.text(), callId);
    if (parsed !== null && parsed.error) {
      return errorResult(rpcErrorMessage(parsed.error));
    }
    if (callRes.status < 200 || callRes.status >= 300) {
      return errorResult(`HTTP ${callRes.status}`);
    }
    if (parsed === null) return errorResult("malformed response");
    const result = parsed.result as ToolResult | undefined;
    if (result === undefined || result === null || typeof result !== "object") {
      return errorResult("malformed response");
    }
    // Hand the upstream result back exactly as received.
    return result;
  }
}

/** Build a forwarding client; tests inject a fake fetch and env through deps. */
export function createClient(deps: ForwardDeps = {}): CargopackClient {
  return new CargopackClient(deps);
}

/** One-shot helper: a fresh client for a single call (the CLI path). */
export async function callTool(
  name: string,
  args: ToolArgs,
  deps: ForwardDeps = {},
): Promise<ToolResult> {
  return new CargopackClient(deps).callTool(name, args);
}
