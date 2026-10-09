import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

// Slide-out duration, shared by the panel's CSS transition (AsidePanel.vue)
// and the teardown delay below so the content isn't cleared mid-animation.
export const ASIDE_TRANSITION_MS = 300

export const useAsideStore = defineStore('aside', () => {
  const isOpen = ref(false)
  const activeComponent = shallowRef(null)
  const activeProps = ref({})
  // Bumped on every open(), and used as the rendered component's :key: each
  // opened node gets a fresh instance instead of the previous node's one
  // being patched with new props (and carrying over its state - e.g. a
  // finished stream - until every watcher has caught up).
  const activeKey = ref(0)

  // Kept so a double close() or a quick re-open never leaves a stale
  // teardown pending.
  let closeTimer = null

  function open(component, props = {}) {
    // Cancel any pending close-teardown timer - otherwise a close() followed
    // by a fast re-open (e.g. rapid tour navigation) still gets its
    // activeComponent/activeProps nulled out shortly after, leaving isOpen
    // true with nothing rendered.
    clearTimeout(closeTimer)
    activeComponent.value = component
    activeProps.value = props
    activeKey.value += 1
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
    clearTimeout(closeTimer)
    closeTimer = setTimeout(() => {
      activeComponent.value = null
      activeProps.value = {}
    }, ASIDE_TRANSITION_MS)
  }

  // Accepts optional args so toggle() can re-open with a fresh component.
  // Falls back to the currently stored values only if they are still set
  // (i.e. within the close window); never opens an empty panel.
  function toggle(component, props) {
    if (isOpen.value) {
      close()
    } else {
      const target = component ?? activeComponent.value
      if (target) {
        open(target, props ?? activeProps.value)
      }
    }
  }

  return {
    isOpen,
    activeComponent,
    activeProps,
    activeKey,
    open,
    close,
    toggle,
  }
})
