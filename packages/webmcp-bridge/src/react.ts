import { useEffect, useRef, useState } from "react";
import { createWebMcpBridge } from "./index.js";
import type { BridgedTool, WebMcpBridge, WebMcpBridgeOptions } from "./types.js";

export type { BridgedTool, WebMcpBridge, WebMcpBridgeOptions } from "./types.js";

export type WebMcpBridgeStatus = "connecting" | "connected" | "error" | "closed";

export interface UseWebMcpBridgeResult {
  status: WebMcpBridgeStatus;
  tools: BridgedTool[];
  error: Error | null;
}

/**
 * Connect to a remote MCP server on mount and register its tools on the
 * page via WebMCP; closes the bridge on unmount. Reconnects when `url`
 * changes. Render this once, near the app root.
 */
export function useWebMcpBridge(
  options: WebMcpBridgeOptions,
): UseWebMcpBridgeResult {
  const [status, setStatus] = useState<WebMcpBridgeStatus>("connecting");
  const [tools, setTools] = useState<BridgedTool[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let bridge: WebMcpBridge | null = null;
    let cancelled = false;

    setStatus("connecting");
    setError(null);
    createWebMcpBridge(optionsRef.current)
      .then((created) => {
        if (cancelled) return void created.close();
        bridge = created;
        setTools(created.tools);
        setStatus(created.active ? "connected" : "closed");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus("error");
      });

    return () => {
      cancelled = true;
      void bridge?.close();
    };
  }, [options.url]);

  return { status, tools, error };
}

export interface WebMcpBridgeProps extends WebMcpBridgeOptions {
  onConnected?: (tools: BridgedTool[]) => void;
  onError?: (error: Error) => void;
}

/** Renderless component wrapper around {@link useWebMcpBridge}. */
export function WebMcpBridgeProvider({
  onConnected,
  onError,
  ...options
}: WebMcpBridgeProps): null {
  const { status, tools, error } = useWebMcpBridge(options);
  const notified = useRef<WebMcpBridgeStatus | null>(null);

  useEffect(() => {
    if (status === notified.current) return;
    notified.current = status;
    if (status === "connected") onConnected?.(tools);
    if (status === "error" && error) onError?.(error);
  }, [status, tools, error, onConnected, onError]);

  return null;
}
