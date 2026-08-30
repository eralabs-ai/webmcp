import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";
import { createWebMcpBridge } from "./index.js";
import type { BridgedTool, WebMcpBridge, WebMcpBridgeOptions } from "./types.js";

export type { BridgedTool, WebMcpBridge, WebMcpBridgeOptions } from "./types.js";

export type WebMcpBridgeStatus = "connecting" | "connected" | "error" | "closed";

export interface UseWebMcpBridgeResult {
  status: Ref<WebMcpBridgeStatus>;
  tools: Ref<BridgedTool[]>;
  error: Ref<Error | null>;
}

/**
 * Vue composable: connect to a remote MCP server on mount and register its
 * tools on the page via WebMCP; closes the bridge on unmount. Call once
 * from a root-level component (client-side only in SSR apps).
 */
export function useWebMcpBridge(
  options: WebMcpBridgeOptions,
): UseWebMcpBridgeResult {
  const status = ref<WebMcpBridgeStatus>("connecting");
  const tools = ref<BridgedTool[]>([]);
  const error = ref<Error | null>(null);
  let bridge: WebMcpBridge | null = null;
  let cancelled = false;

  onMounted(async () => {
    try {
      const created = await createWebMcpBridge(options);
      if (cancelled) return void created.close();
      bridge = created;
      tools.value = created.tools;
      status.value = created.active ? "connected" : "closed";
    } catch (err) {
      if (cancelled) return;
      error.value = err instanceof Error ? err : new Error(String(err));
      status.value = "error";
    }
  });

  onBeforeUnmount(() => {
    cancelled = true;
    void bridge?.close();
  });

  return { status, tools, error };
}
