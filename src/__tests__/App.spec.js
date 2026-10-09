import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from '../App.vue'
import InfiniteNodeFeed from '../components/nodes/InfiniteNodeFeed.vue'

describe('App', () => {
  it('renders the routed view', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          name: 'main',
          component: () => import('../views/Main.vue'),
        },
      ],
    })

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await router.isReady()
    await flushPromises(wrapper)

    expect(wrapper.findComponent(InfiniteNodeFeed).exists()).toBe(true)
  })
})

async function flushPromises(wrapper) {
  await Promise.resolve()
  await wrapper.vm.$nextTick()
}
