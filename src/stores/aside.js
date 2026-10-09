import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

export const useAsideStore = defineStore('aside', () => {
  const isOpen = ref(false)
  const activeComponent = shallowRef(null)
  const activeProps = ref({})

  // Finding #2: store the timer ref so double-close or store disposal
  // never stacks two pending clearances.
  let closeTimer = null

  function open(component, props = {}) {
    // Cancel any pending close-teardown timer - otherwise a close() followed
    // by a fast re-open (e.g. rapid tour navigation) still gets its
    // activeComponent/activeProps nulled out 300ms later, leaving isOpen
    // true with nothing rendered.
    clearTimeout(closeTimer)
    activeComponent.value = component
    activeProps.value = props
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
    // Finding #2: cancel any in-flight timer before starting a new one.
    clearTimeout(closeTimer)
    closeTimer = setTimeout(() => {
      activeComponent.value = null
      activeProps.value = {}
    }, 300)
  }

  // Finding #1: accept optional args so toggle() can re-open with a fresh
  // component. Falls back to the currently stored values only if they are
  // still set (i.e. within the 300 ms close window); never opens an empty panel.
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
    open,
    close,
    toggle,
  }
})
