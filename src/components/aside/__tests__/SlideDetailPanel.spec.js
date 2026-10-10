import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SlideDetailPanel from '../SlideDetailPanel.vue'

describe('SlideDetailPanel', () => {
  it('shows the index and value of the slide', () => {
    const wrapper = mount(SlideDetailPanel, { props: { slide: { index: 4, value: 'hello' } } })

    expect(wrapper.text()).toContain('#4')
    expect(wrapper.text()).toContain('hello')
    expect(wrapper.text()).not.toContain('No slide selected.')
  })

  it('shows a placeholder when no slide is selected', () => {
    const wrapper = mount(SlideDetailPanel)

    expect(wrapper.text()).toContain('No slide selected.')
  })
})
