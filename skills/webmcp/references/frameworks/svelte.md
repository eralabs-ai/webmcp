# Svelte and SvelteKit

Register only in the browser. In SvelteKit, guard with the `browser` flag or
place code in lifecycle callbacks, which only run client-side.

## Svelte 5: $effect

`$effect` gives registration, cleanup, and contextual re-registration in one
block; reading reactive state inside makes the effect re-run when it changes:

```svelte
<script>
  import { getModelContext } from "$lib/webmcp"; // feature detection, runtime.md

  let { productId } = $props();

  $effect(() => {
    const mc = getModelContext();
    if (!mc?.registerTool) return;

    const controller = new AbortController();
    mc.registerTool(makeAddToCartTool(productId), { signal: controller.signal })
      .catch((err) => console.warn("webmcp: registration failed", err));

    return () => controller.abort();
  });
</script>
```

Because `productId` is read inside the effect, a param change aborts the old
registration and registers the fresh one automatically. That is exactly the
contextual-tool contract.

## Svelte 4: onMount / onDestroy

```svelte
<script>
  import { onMount, onDestroy } from "svelte";
  let controller;

  onMount(() => {
    const mc = getModelContext();
    if (!mc?.registerTool) return;
    controller = new AbortController();
    mc.registerTool(tool, { signal: controller.signal })
      .catch((err) => console.warn("webmcp: registration failed", err));
  });

  onDestroy(() => controller?.abort());
</script>
```

For contextual tools in Svelte 4, add a reactive statement that aborts and
re-registers when the subject changes.

## SvelteKit placement

- **Everywhere tools**: register from the root `+layout.svelte`; client-side
  navigation keeps the layout mounted, so the registration survives routes.
- **Contextual tools**: register from the owning `+page.svelte`; navigation
  unmounts the page and the cleanup aborts.
- **Polyfill**: initialize in the root layout inside `onMount` (or behind
  `if (browser)`), before any registration.
- `execute` wiring: same-origin `+server.ts` endpoints and form actions are
  valid targets when they enforce authorization; never import `$lib/server`
  code into a tool.
- **Auth-gated tools**: derive from the session store; register on login,
  abort on logout, exactly as with any contextual state.

## Stores as wiring

Tools should call the app's existing stores and data functions. A cart tool
calls the same `cart.add()` the button calls, so the UI badge updates and
the user sees what the agent did.
