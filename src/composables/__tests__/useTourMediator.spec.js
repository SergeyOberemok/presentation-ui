import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, ref, withDirectives } from 'vue'
import { useTourStore } from '@/stores/tour'
import { useTourMediator } from '../useTourMediator'

describe('useTourMediator (v-tour-slide)', () => {
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
          const { vTourSlide } = useTourMediator()
          return () =>
            h(
              'ul',
              list.value.map((i) => withDirectives(h('li', { key: i }), [[vTourSlide, i]])),
            )
        },
      }),
    )
    return { list, wrapper }
  }

  it('registers each rendered slide element under its index', () => {
    const { wrapper } = mountList([3, 4])

    const items = wrapper.findAll('li')
    expect(tourStore.slideEls.get(3)).toBe(items[0].element)
    expect(tourStore.slideEls.get(4)).toBe(items[1].element)
  })

  it('registers slides added later and unregisters removed ones', async () => {
    const { list, wrapper } = mountList([3, 4])

    list.value = [4, 5]
    await wrapper.vm.$nextTick()

    expect([...tourStore.slideEls.keys()].sort()).toEqual([4, 5])
  })

  it('unregisters everything on unmount', () => {
    const { wrapper } = mountList([3, 4])

    wrapper.unmount()

    expect(tourStore.slideEls.size).toBe(0)
  })

  it('moves the registration when a slide element is re-bound to another index', async () => {
    const index = ref(3)
    const wrapper = mount(
      defineComponent({
        setup() {
          const { vTourSlide } = useTourMediator()
          return () => withDirectives(h('li'), [[vTourSlide, index.value]])
        },
      }),
    )
    const el = wrapper.element

    index.value = 7
    await wrapper.vm.$nextTick()

    expect(tourStore.slideEls.has(3)).toBe(false)
    expect(tourStore.slideEls.get(7)).toBe(el)
  })

  it('keeps the registration when an update does not change the index', async () => {
    const label = ref('a')
    const wrapper = mount(
      defineComponent({
        setup() {
          const { vTourSlide } = useTourMediator()
          return () => withDirectives(h('li', label.value), [[vTourSlide, 3]])
        },
      }),
    )

    label.value = 'b'
    await wrapper.vm.$nextTick()

    expect(tourStore.slideEls.get(3)).toBe(wrapper.element)
  })
})
