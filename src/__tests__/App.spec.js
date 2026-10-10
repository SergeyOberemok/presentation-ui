import { describe, expect, it } from 'vitest'

import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '../App.vue'
import InfiniteSlideFeed from '../components/feed/InfiniteSlideFeed.vue'

describe('App', () => {
  it('renders the routed view', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          name: 'main',
          component: () => import('../views/MainView.vue'),
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

    expect(wrapper.findComponent(InfiniteSlideFeed).exists()).toBe(true)
  })
})

async function flushPromises(wrapper) {
  await Promise.resolve()
  await wrapper.vm.$nextTick()
}
