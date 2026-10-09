import TextNode from '@/components/TextNode.vue'
import SlideTextStream from '@/components/slides/SlideTextStream.vue'
import { MAIN, nodeNamespace, resolveDestination } from '@/factories/nodeDestination'

// Resolved per node `type` namespace (the part before ":", e.g. "file" in
// "file:md"). Each resolver decides which component renders the node and what
// props it needs - extension-specific choices (e.g. markdown vs plain text)
// are left to that component, not re-derived here. Where the node is shown is
// decided separately by resolveDestination() (see nodeDestination.js).
const TYPE_RESOLVERS = {
  text: (node) => ({
    component: TextNode,
    props: { value: node.value },
  }),
  file: (node, destination) => ({
    component: SlideTextStream,
    props: {
      filename: node.value,
      index: node.index,
      // An inline slide streams its first chunk as soon as the tour reaches
      // it; the aside opens empty and waits for ArrowRight to start.
      autoStart: destination === MAIN,
    },
  }),
}

export function resolveNodeDescriptor(node) {
  const resolve = TYPE_RESOLVERS[nodeNamespace(node)] ?? TYPE_RESOLVERS.text
  const destination = resolveDestination(node)

  return { ...resolve(node, destination), destination }
}
