// Where a node is shown - "main" (inline in the feed) or "chat" (the aside
// panel). Kept apart from nodeFactory.js, which maps nodes to components, so
// navigation/routing logic (useGuidedTour, useNodeRouter) and the feed all
// agree on the same rule without importing any SFCs: if the tour and the feed
// ever disagreed, the tour would try to scroll to an element that was never
// rendered.

export const MAIN = 'main'
export const CHAT = 'chat'

// The part of `type` before ":", e.g. "file" in "file:md". A missing type is
// treated as plain text.
export function nodeNamespace(node) {
  return (node.type ?? 'text').split(':')[0]
}

// Per-namespace default, used when the backend doesn't send `destination`
// (today it never does - the schema's Node only has `type`/`value`).
const DEFAULT_DESTINATIONS = {
  text: () => MAIN,
  // `file:json` renders as an inline code slide in the main feed; every other
  // file type defaults to the aside panel the backend designed this
  // namespace around.
  file: (node) => (node.type === 'file:json' ? MAIN : CHAT),
}

// Unknown namespaces fall back to "main" rather than `undefined`, which would
// make the node vanish from both the feed and the aside.
export function resolveDestination(node) {
  return node.destination ?? DEFAULT_DESTINATIONS[nodeNamespace(node)]?.(node) ?? MAIN
}
