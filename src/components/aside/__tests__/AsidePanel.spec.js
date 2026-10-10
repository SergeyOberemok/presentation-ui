import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick, onMounted, ref } from 'vue'

const isLg = ref(true)
let escapeHandler = null

vi.mock('@vueuse/core', () => ({
  useMediaQuery: () => isLg,
  onKeyStroke: (key, handler) => {
    if (key === 'Escape') escapeHandler = handler
  },
}))

import { useAsideStore } from '@/stores/aside'
import AsidePanel from '../AsidePanel.vue'

const mounted = vi.fn()
const Probe = defineComponent({
  props: { label: { type: String, default: '' } },
  setup(props) {
    onMounted(mounted)
    return () => h('p', { class: 'probe' }, props.label)
  },
})

describe('AsidePanel', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAsideStore()
    isLg.value = true
    escapeHandler = null
    mounted.mockClear()
  })

  it('renders the active component with its props', async () => {
    const wrapper = mount(AsidePanel)

    store.open(Probe, { label: 'hello' })
    await nextTick()

    expect(wrapper.find('.probe').text()).toBe('hello')
  })

  it('mounts a fresh instance for every open(), even of the same component', async () => {
    // Each node opened in the aside must start from clean state rather than
    // inherit the previous node's (e.g. a finished stream).
    mount(AsidePanel)

    store.open(Probe, { label: 'a' })
    await nextTick()
    store.open(Probe, { label: 'b' })
    await nextTick()

    expect(mounted).toHaveBeenCalledTimes(2)
  })

  it('closes on Escape while open', () => {
    mount(AsidePanel)
    store.open(Probe)

    escapeHandler()

    expect(store.isOpen).toBe(false)
  })

  it('ignores Escape while closed, leaving no teardown pending', () => {
    vi.useFakeTimers()
    mount(AsidePanel)
    store.open(Probe)
    store.isOpen = false // closed without scheduling a teardown

    escapeHandler()
    vi.runAllTimers()

    expect(store.activeComponent).toBe(Probe) // close() would have cleared it
    vi.useRealTimers()
  })

  it('closes from the close button', async () => {
    const wrapper = mount(AsidePanel)
    store.open(Probe)
    await nextTick()

    await wrapper.find('[aria-label="Close panel"]').trigger('click')

    expect(store.isOpen).toBe(false)
  })

  it('keeps the closed desktop panel out of the focus order', async () => {
    const wrapper = mount(AsidePanel)

    expect(wrapper.find('aside').attributes('inert')).toBeDefined()

    store.open(Probe)
    await nextTick()

    expect(wrapper.find('aside').attributes('inert')).toBeUndefined()
  })

  it('shows a backdrop on small screens that closes the panel', async () => {
    isLg.value = false
    const wrapper = mount(AsidePanel)
    store.open(Probe)
    await nextTick()

    await wrapper.find('.bg-black\\/40').trigger('click')

    expect(store.isOpen).toBe(false)
  })

  it('closes the mobile drawer from its close button', async () => {
    isLg.value = false
    const wrapper = mount(AsidePanel)
    store.open(Probe)
    await nextTick()

    await wrapper.find('aside [aria-label="Close panel"]').trigger('click')

    expect(store.isOpen).toBe(false)
  })

  it('does not mount the mobile drawer until something was opened', () => {
    isLg.value = false
    const wrapper = mount(AsidePanel)

    expect(wrapper.find('aside').exists()).toBe(false)
  })
})
