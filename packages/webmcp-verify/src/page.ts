// Expressions evaluated inside the page. Values are injected as JSON so
// tool names and inputs cannot break out of the expression.

const RESOLVE_MC = `const mc = document.modelContext ?? navigator.modelContext;`;

export function listToolsExpression(): string {
  return `(async () => {
  ${RESOLVE_MC}
  if (!mc) return { error: "no-modelcontext" };
  const tools = await mc.getTools();
  return {
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description ?? "",
      annotations: t.annotations ? JSON.parse(JSON.stringify(t.annotations)) : null,
      inputSchema: (() => {
        try { return t.inputSchema ? JSON.parse(JSON.stringify(t.inputSchema)) : null; }
        catch { return null; }
      })(),
    })),
  };
})()`;
}

export function executeToolExpression(
  name: string,
  input: Record<string, unknown>,
): string {
  return `(async () => {
  ${RESOLVE_MC}
  if (!mc) return { error: "no-modelcontext" };
  const tools = await mc.getTools();
  const tool = tools.find((t) => t.name === ${JSON.stringify(name)});
  if (!tool) return { error: "not-found", names: tools.map((t) => t.name) };
  // Spec: inputObject is an object. Chrome ~151 only parses a JSON string;
  // try the spec shape first, then fall back for current previews.
  try {
    const raw = await mc.executeTool(tool, ${JSON.stringify(input)});
    return { raw };
  } catch (specShapeError) {
    try {
      const raw = await mc.executeTool(tool, ${JSON.stringify(JSON.stringify(input))});
      return { raw };
    } catch {
      return {
        error: "execute-threw",
        message: String((specShapeError && specShapeError.message) ?? specShapeError),
      };
    }
  }
})()`;
}
