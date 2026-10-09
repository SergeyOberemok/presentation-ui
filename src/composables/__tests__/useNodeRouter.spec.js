import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useTourStore } from '@/stores/tour'
import { useNodesStore } from '@/stores/nodes'
import { useAsideStore } from '@/stores/aside'
import SlideTextStream from '@/components/slides/SlideTextStream.vue'
import { useNodeRouter } from '../useNodeRouter'

function seedItems(nodesStore, items) {
  nodesStore.items = items.map((item, index) => ({ ...item, index }))
}

describe('useNodeRouter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('opens the aside with the resolved component/props for a chat-destination node', () => {
    const tourStore = useTourStore()
    const nodesStore = useNodesStore()
    const asideStore = useAsideStore()
    seedItems(nodesStore, [{ type: 'file:md', destination: 'chat', value: 'notes.md' }])

    useNodeRouter()
    tourStore.currentIndex = 0

    expect(asideStore.isOpen).toBe(true)
    expect(asideStore.activeComponent).toBe(SlideTextStream)
    expect(asideStore.activeProps).toEqual({ filename: 'notes.md', index: 0 })
  })

  it('closes the aside when the current node is a main-destination node', async () => {
    const tourStore = useTourStore()
    const nodesStore = useNodesStore()
    const asideStore = useAsideStore()
    seedItems(nodesStore, [
      { type: 'file:md', destination: 'chat', value: 'notes.md' },
      { type: 'text', value: 'hello' },
    ])

    useNodeRouter()
    tourStore.currentIndex = 0
    expect(asideStore.isOpen).toBe(true)

    tourStore.currentIndex = 1
    await nextTick()

    expect(asideStore.isOpen).toBe(false)
  })

  it('does nothing while the current index has no loaded node yet', async () => {
    const tourStore = useTourStore()
    const asideStore = useAsideStore()

    useNodeRouter()
    tourStore.currentIndex = 5
    await nextTick()

    expect(asideStore.isOpen).toBe(false)
    expect(asideStore.activeComponent).toBeNull()
  })

  it('opens the aside for a file node with no explicit destination (real backend shape)', () => {
    const tourStore = useTourStore()
    const nodesStore = useNodesStore()
    const asideStore = useAsideStore()
    seedItems(nodesStore, [{ type: 'file:md', value: 'notes.md' }])

    useNodeRouter()
    tourStore.currentIndex = 0

    expect(asideStore.isOpen).toBe(true)
    expect(asideStore.activeComponent).toBe(SlideTextStream)
  })

  it('resolves a plain text node to TextNode without opening the aside', () => {
    const tourStore = useTourStore()
    const nodesStore = useNodesStore()
    const asideStore = useAsideStore()
    seedItems(nodesStore, [{ type: 'text', value: 'hello' }])

    useNodeRouter()
    tourStore.currentIndex = 0

    expect(asideStore.isOpen).toBe(false)
  })
})
