import { describe, expect, it } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";
import { createWebMcpBridge } from "../src/index.js";
import type { ModelContextLike, ModelContextTool } from "../src/types.js";

/** In-memory ModelContext capturing registrations, like the browser would. */
function fakeModelContext() {
  const tools = new Map<string, ModelContextTool>();
  const mc: ModelContextLike = {
    async registerTool(tool, options) {
      if (tools.has(tool.name)) {
        throw new DOMException(`duplicate tool ${tool.name}`, "InvalidStateError");
      }
      tools.set(tool.name, tool);
      options?.signal?.addEventListener("abort", () => tools.delete(tool.name));
    },
  };
  return { mc, tools };
}

async function makeServer() {
  const server = new McpServer({ name: "test-server", version: "1.0.0" });
  server.registerTool(
    "get_weather",
    {
      description: "Get the weather for a city.",
      inputSchema: { city: z.string() },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ city }) => ({
      content: [{ type: "text", text: `sunny in ${city}` }],
      structuredContent: { city, forecast: "sunny" },
    }),
  );
  server.registerTool(
    "delete_everything",
    { description: "Dangerous tool." },
    async () => ({ content: [{ type: "text", text: "boom" }] }),
  );
  server.registerTool(
    "always_fails",
    { description: "Returns an MCP error result." },
    async () => ({
      content: [{ type: "text", text: "upstream exploded" }],
      isError: true,
    }),
  );
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  return { server, clientTransport };
}

describe("createWebMcpBridge", () => {
  it("registers remote tools with mapped annotations", async () => {
    const { clientTransport } = await makeServer();
    const { mc, tools } = fakeModelContext();
    const bridge = await createWebMcpBridge({ transport: clientTransport, modelContext: mc });

    expect([...tools.keys()].sort()).toEqual([
      "always_fails",
      "delete_everything",
      "get_weather",
    ]);
    const weather = tools.get("get_weather")!;
    expect(weather.description).toBe("Get the weather for a city.");
    expect(weather.annotations).toEqual({
      readOnlyHint: true,
      untrustedContentHint: true,
    });
    expect(tools.get("delete_everything")!.annotations).toEqual({
      readOnlyHint: false,
      untrustedContentHint: false,
    });
    expect(bridge.tools.map((t) => t.remoteName).sort()).toEqual([
      "always_fails",
      "delete_everything",
      "get_weather",
    ]);
    await bridge.close();
  });

  it("executes through the MCP server and prefers structuredContent", async () => {
    const { clientTransport } = await makeServer();
    const { mc, tools } = fakeModelContext();
    const bridge = await createWebMcpBridge({ transport: clientTransport, modelContext: mc });

    const result = await tools.get("get_weather")!.execute({ city: "Lisbon" });
    expect(result).toEqual({ city: "Lisbon", forecast: "sunny" });
    await bridge.close();
  });

  it("throws on MCP error results instead of returning them as success", async () => {
    const { clientTransport } = await makeServer();
    const { mc, tools } = fakeModelContext();
    const bridge = await createWebMcpBridge({ transport: clientTransport, modelContext: mc });

    await expect(tools.get("always_fails")!.execute({})).rejects.toThrow(
      "upstream exploded",
    );
    await bridge.close();
  });

  it("applies include/exclude filters and namePrefix", async () => {
    const { clientTransport } = await makeServer();
    const { mc, tools } = fakeModelContext();
    const bridge = await createWebMcpBridge({
      transport: clientTransport,
      modelContext: mc,
      include: ["get_weather", "delete_everything"],
      exclude: ["delete_everything"],
      namePrefix: "acme.",
    });

    expect([...tools.keys()]).toEqual(["acme.get_weather"]);
    expect(bridge.tools).toEqual([
      {
        name: "acme.get_weather",
        remoteName: "get_weather",
        description: "Get the weather for a city.",
      },
    ]);
    await bridge.close();
  });

  it("unregisters everything on close", async () => {
    const { clientTransport } = await makeServer();
    const { mc, tools } = fakeModelContext();
    const bridge = await createWebMcpBridge({ transport: clientTransport, modelContext: mc });

    expect(tools.size).toBe(3);
    await bridge.close();
    expect(tools.size).toBe(0);
    expect(bridge.active).toBe(false);
  });

  it("re-syncs when the server's tool list changes", async () => {
    const { server, clientTransport } = await makeServer();
    const { mc, tools } = fakeModelContext();
    const bridge = await createWebMcpBridge({ transport: clientTransport, modelContext: mc });

    expect(tools.size).toBe(3);
    server.registerTool(
      "book_table",
      { description: "Book a table." },
      async () => ({ content: [{ type: "text", text: "booked" }] }),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(tools.has("book_table")).toBe(true);
    expect(tools.size).toBe(4);
    await bridge.close();
  });

  it("returns an inert bridge when no ModelContext exists", async () => {
    const { clientTransport } = await makeServer();
    const bridge = await createWebMcpBridge({ transport: clientTransport });
    expect(bridge.active).toBe(false);
    expect(bridge.tools).toEqual([]);
    await bridge.close();
  });
});
