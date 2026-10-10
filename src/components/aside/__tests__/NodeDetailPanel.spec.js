import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NodeDetailPanel from '../NodeDetailPanel.vue'

describe('NodeDetailPanel', () => {
  it('shows the index and value of the node', () => {
    const wrapper = mount(NodeDetailPanel, { props: { node: { index: 4, value: 'hello' } } })

    expect(wrapper.text()).toContain('#4')
    expect(wrapper.text()).toContain('hello')
    expect(wrapper.text()).not.toContain('No node selected.')
  })

  it('shows a placeholder when no node is selected', () => {
    const wrapper = mount(NodeDetailPanel)

    expect(wrapper.text()).toContain('No node selected.')
  })
})
