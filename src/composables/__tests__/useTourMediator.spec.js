import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, ref, withDirectives } from 'vue'
import { useTourStore } from '@/stores/tour'
import { useTourMediator } from '../useTourMediator'

describe('useTourMediator (v-tour-node)', () => {
  let tourStore

  beforeEach(() => {
    setActivePinia(createPinia())
    tourStore = useTourStore()
  })

  function mountList(indices) {
    const list = ref(indices)
    const wrapper = mount(
      defineComponent({
        setup() {
          const { vTourNode } = useTourMediator()
          return () =>
            h(
              'ul',
              list.value.map((i) => withDirectives(h('li', { key: i }), [[vTourNode, i]])),
            )
        },
      }),
    )
    return { list, wrapper }
  }

  it('registers each rendered node element under its index', () => {
    const { wrapper } = mountList([3, 4])

    const items = wrapper.findAll('li')
    expect(tourStore.nodeEls.get(3)).toBe(items[0].element)
    expect(tourStore.nodeEls.get(4)).toBe(items[1].element)
  })

  it('registers nodes added later and unregisters removed ones', async () => {
    const { list, wrapper } = mountList([3, 4])

    list.value = [4, 5]
    await wrapper.vm.$nextTick()

    expect([...tourStore.nodeEls.keys()].sort()).toEqual([4, 5])
  })

  it('unregisters everything on unmount', () => {
    const { wrapper } = mountList([3, 4])

    wrapper.unmount()

    expect(tourStore.nodeEls.size).toBe(0)
  })
})
