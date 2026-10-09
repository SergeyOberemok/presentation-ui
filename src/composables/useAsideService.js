import { storeToRefs } from 'pinia'
import { useAsideStore } from '@/stores/aside'

/**
 * Service façade for the aside panel.
 *
 * Exposes reactive state and actions without requiring callers to import the
 * store directly.  Must be called inside a component's setup() or a composable
 * that is itself invoked from setup() — calling outside Vue's setup context
 * will throw "getActivePinia was called with no active Pinia".
 *
 * @returns {{ isOpen, activeComponent, activeProps, open, close, toggle }}
 */
export function useAsideService() {
  const store = useAsideStore()
  const { isOpen, activeComponent, activeProps } = storeToRefs(store)
  const { open, close, toggle } = store

  return { isOpen, activeComponent, activeProps, open, close, toggle }
}
