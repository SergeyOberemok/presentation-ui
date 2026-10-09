import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { useScrollAnchoredPrepend } from '../useScrollAnchoredPrepend'

const ROW_HEIGHT = 50

// jsdom has no layout, so the container's scrollHeight is derived from what's
// actually rendered - which is what tells the "before render" measurement
// apart from the "after render" one.
function mountList(initialIndices, { scrollTop = 100 } = {}) {
  const indices = ref(initialIndices)
  let root = null
  const container = {
    scrollTop,
    get scrollHeight() {
      return root.querySelectorAll('li').length * ROW_HEIGHT
    },
  }

  const wrapper = mount(
    defineComponent({
      setup() {
        useScrollAnchoredPrepend(container, () => indices.value[0] ?? null)
        return () =>
          h(
            'ul',
            indices.value.map((i) => h('li', { key: i }, String(i))),
          )
      },
    }),
  )
  root = wrapper.element

  return { indices, container }
}

describe('useScrollAnchoredPrepend', () => {
  it('shifts scrollTop by the height of the prepended content', async () => {
    const { indices, container } = mountList([4, 5])

    indices.value = [2, 3, 4, 5]
    await nextTick()

    expect(container.scrollTop).toBe(100 + 2 * ROW_HEIGHT)
  })

  it('leaves scrollTop alone when content is appended', async () => {
    const { indices, container } = mountList([4, 5])

    indices.value = [4, 5, 6, 7]
    await nextTick()

    expect(container.scrollTop).toBe(100)
  })

  it('does not anchor the initial load', async () => {
    const { indices, container } = mountList([], { scrollTop: 0 })

    indices.value = [0, 1, 2]
    await nextTick()

    expect(container.scrollTop).toBe(0)
  })
})
