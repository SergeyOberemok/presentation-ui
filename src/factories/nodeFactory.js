import TextNode from '@/components/TextNode.vue'
import SlideTextStream from '@/components/slides/SlideTextStream.vue'

// Resolved per node `type` namespace (the part before ":", e.g. "file" in
// "file:md"). Each resolver decides which component renders the node, what
// props it needs - extension-specific choices (e.g. markdown vs plain text)
// are left to that component, not re-derived here - and which destination
// that type implies when the backend doesn't send one explicitly (today it
// never sends `destination` for file nodes, only `type`/`value`).
const TYPE_RESOLVERS = {
  text: (node) => ({
    component: TextNode,
    props: { value: node.value },
    defaultDestination: 'main',
  }),
  file: (node) => {
    // `file:json` is meant to render as an inline code slide in the main
    // feed; every other file type still defaults to the aside ("chat")
    // panel the backend originally designed this namespace around.
    const defaultDestination = node.type === 'file:json' ? 'main' : 'chat'

    return {
      component: SlideTextStream,
      props: {
        filename: node.value,
        index: node.index,
        // An inline slide streams its first chunk as soon as the tour reaches
        // it; the aside opens empty and waits for ArrowRight to start.
        autoStart: (node.destination ?? defaultDestination) === 'main',
      },
      defaultDestination,
    }
  },
}

export function resolveNodeDescriptor(node) {
  const [namespace] = (node.type ?? 'text').split(':')
  const resolve = TYPE_RESOLVERS[namespace] ?? TYPE_RESOLVERS.text
  const { component, props, defaultDestination } = resolve(node)

  return { component, props, destination: node.destination ?? defaultDestination ?? 'main' }
}
