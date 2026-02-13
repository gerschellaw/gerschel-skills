#!/usr/bin/env node

// Minimal MCP stdio server — no dependencies required.
// Implements just enough of the JSON-RPC / MCP protocol to expose a single tool.

import { createInterface } from "readline";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const TOKEN_PATH = join(homedir(), ".gerschel", "db-api-token");
const API_URL = "https://portal.gerschellaw.com/api/sql-query";

const SERVER_INFO = {
  name: "gerschel-db",
  version: "1.0.0",
};

const TOOL = {
  name: "query_database",
  description:
    "Execute a read-only SQL query against the Gerschel portal database. Returns rows, fields, and execution time. The API blocks write operations (INSERT, UPDATE, DELETE, DROP, etc.) and enforces a 30-second timeout. Many table and column names contain spaces — wrap them in double quotes.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The SQL query to execute (read-only)",
      },
    },
    required: ["query"],
  },
};

function getToken() {
  if (!existsSync(TOKEN_PATH)) {
    return null;
  }
  return readFileSync(TOKEN_PATH, "utf-8").trim();
}

async function executeQuery(query) {
  const token = getToken();
  if (!token) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `API key not found. Please:\n1. Go to https://portal.gerschellaw.com/tools/api-keys and generate a key\n2. Save it to ${TOKEN_PATH}`,
        },
      ],
    };
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const detail = body?.data || body;
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `HTTP ${res.status}: ${res.statusText}\n${JSON.stringify(detail, null, 2)}`,
          },
        ],
      };
    }

    const data = await res.json();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  } catch (err) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Request failed: ${err.message}`,
        },
      ],
    };
  }
}

// --- JSON-RPC / MCP stdio transport ---

function send(msg) {
  const json = JSON.stringify(msg);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`);
}

function sendResult(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handleMessage(msg) {
  const { id, method, params } = msg;

  switch (method) {
    case "initialize":
      sendResult(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
      break;

    case "notifications/initialized":
      // No response needed for notifications
      break;

    case "tools/list":
      sendResult(id, { tools: [TOOL] });
      break;

    case "tools/call": {
      const toolName = params?.name;
      if (toolName !== "query_database") {
        sendError(id, -32602, `Unknown tool: ${toolName}`);
        return;
      }
      const query = params?.arguments?.query;
      if (!query) {
        sendError(id, -32602, "Missing required argument: query");
        return;
      }
      const result = await executeQuery(query);
      sendResult(id, result);
      break;
    }

    default:
      if (id !== undefined) {
        sendError(id, -32601, `Method not found: ${method}`);
      }
      break;
  }
}

// Parse incoming messages (Content-Length framed JSON-RPC)
let buffer = "";

process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;

  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) break;

    const header = buffer.slice(0, headerEnd);
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      buffer = buffer.slice(headerEnd + 4);
      continue;
    }

    const contentLength = parseInt(match[1], 10);
    const bodyStart = headerEnd + 4;

    if (buffer.length < bodyStart + contentLength) break;

    const body = buffer.slice(bodyStart, bodyStart + contentLength);
    buffer = buffer.slice(bodyStart + contentLength);

    try {
      const msg = JSON.parse(body);
      handleMessage(msg);
    } catch (err) {
      process.stderr.write(`Parse error: ${err.message}\n`);
    }
  }
});

process.stdin.on("end", () => process.exit(0));
