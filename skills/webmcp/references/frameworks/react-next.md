# React and Next.js

WebMCP is a document API: register only in client code that runs in the
browser. In Next.js that means `"use client"` components; never Server
Components, Route Handlers, or middleware.

## Core pattern: effect + AbortController

One reusable hook covers registration, cleanup, and re-registration:

```tsx
"use client";

import { useEffect } from "react";
import { getModelContext } from "@/lib/webmcp"; // feature detection, runtime.md

export function useWebMCPTool(tool, deps = []) {
  useEffect(() => {
    const mc = getModelContext();
    if (!mc?.registerTool) return;

    const controller = new AbortController();
    mc.registerTool(tool, { signal: controller.signal })
      .catch((err) => console.warn(`webmcp: ${tool.name} failed`, err));

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
```

Notes on this pattern:

- **StrictMode double-invoke is handled by the cleanup**: the first mount's
  abort unregisters before the second mount registers. Never work around
  StrictMode with module-level "already registered" flags; they leak stale
  closures.
- **Deps drive contextual re-registration.** A product-page tool that bakes
  in the viewed product passes `[productId]`; on param change the old
  registration aborts and the new one registers. Passing `[]` for a
  contextual tool is the stale-registration bug.
- Hoist static `inputSchema` objects to module scope so deps stay honest.
- The catch matters: duplicate names reject, and registration must never
  crash the component tree.

## Where tools mount

- **Everywhere tools** (retrieval, site-wide search): a small
  `<WebMCPTools />` client component rendered once from the root layout.
- **Contextual tools**: mount the hook in the page/feature component that
  owns the context; unmount aborts automatically on client-side navigation.
- **Auth-gated tools**: gate on the session state the app already has:

```tsx
function AccountTools() {
  const { user } = useSession();
  useWebMCPTool(makeMyOrdersTool(user), [user?.id]);
  return null;
}
// render only when user exists; unmount on logout aborts the registration
```

## Next.js App Router specifics

- Put polyfill init (when needed) in a tiny client component imported by
  the root layout, before any tool component:

```tsx
// app/webmcp-provider.tsx
"use client";
import { initializeWebMCPPolyfill } from "@mcp-b/webmcp-polyfill";
initializeWebMCPPolyfill();
export function WebMCPProvider() { return null; }
```

- `execute` may call Server Actions that are client-invocable and Route
  Handlers under the same origin; both count as safe wiring **only** when
  the action/route enforces authorization itself.
- With the Pages Router, the same patterns apply from `_app.tsx`.
- Client-side navigation preserves registrations; a full reload (or
  `router.refresh()` on a hard nav) destroys them, which the root-layout
  mount already handles.

## Existing helper packages

`usewebmcp` and `@mcp-b/react-webmcp` provide maintained hooks with the
same semantics. Prefer them only when the user opts in to a dependency;
the ~20-line hook above keeps the repo dependency-free and is usually the
right default.
