# Vue and Nuxt

Register only in browser-side code: components, composables, or client
plugins. Never in server middleware or during SSR rendering.

## Core pattern: composable

```ts
// composables/useWebMCPTool.ts
import { onMounted, onBeforeUnmount, watch, type WatchSource } from "vue";
import { getModelContext } from "@/lib/webmcp"; // feature detection, runtime.md

export function useWebMCPTool(
  makeTool: () => object,
  contextKey?: WatchSource, // pass a ref/getter for contextual tools
) {
  let controller: AbortController | null = null;

  const register = () => {
    const mc = getModelContext();
    if (!mc?.registerTool) return;
    controller?.abort();
    controller = new AbortController();
    mc.registerTool(makeTool(), { signal: controller.signal })
      .catch((err) => console.warn("webmcp: registration failed", err));
  };

  onMounted(register);
  onBeforeUnmount(() => controller?.abort());
  if (contextKey) watch(contextKey, register);
}
```

- `onBeforeUnmount` aborts on component teardown, which covers `<router-view>`
  navigation in an SPA.
- The `watch` re-registers a contextual tool when its subject changes (for
  example `() => route.params.productId` on a product page). Skipping this
  leaves the tool pointing at the previous product.
- `execute` should call the app's existing stores (Pinia) or same-origin
  API layer, not re-implement logic.

## Usage

```vue
<script setup lang="ts">
const route = useRoute();
const product = useProductStore();

useWebMCPTool(
  () => ({
    name: "add_to_cart",
    description:
      "Add the product shown on this page to the visitor's cart. Returns the updated cart count.",
    inputSchema: {
      type: "object",
      properties: {
        quantity: { type: "integer", description: "How many to add.", minimum: 1 },
      },
      required: ["quantity"],
      additionalProperties: false,
    },
    async execute({ quantity }) {
      const cart = await product.addToCart(route.params.id, quantity);
      return { added: quantity, cartCount: cart.count };
    },
  }),
  () => route.params.id,
);
</script>
```

## Placement

- **Everywhere tools**: a renderless component (or plain composable call) in
  `App.vue` / the root layout.
- **Auth-gated tools**: wrap registration in a `watch` on the auth store;
  register on login, abort on logout.

## Nuxt specifics

- Polyfill init and app-wide registration belong in a client-only plugin:

```ts
// plugins/webmcp.client.ts
export default defineNuxtPlugin(() => {
  // initializeWebMCPPolyfill() when needed, then app-wide registrations
});
```

- The `.client.ts` suffix guarantees browser-only execution; never touch
  `document.modelContext` in universal code without an `import.meta.client`
  guard.
- `useFetch`/`$fetch` to same-origin Nitro routes is valid wiring when those
  routes enforce authorization server-side.

## Options API

Use `mounted`/`beforeUnmount` with the same AbortController discipline; the
composable above is still callable from `setup()` and is preferred.
