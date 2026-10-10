import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PlainTextRenderer from '../PlainTextRenderer.vue'

describe('PlainTextRenderer', () => {
  it('renders the text verbatim inside a pre block', () => {
    const wrapper = mount(PlainTextRenderer, { props: { text: 'line 1\nline 2' } })

    expect(wrapper.find('pre').text()).toBe('line 1\nline 2')
  })

  it('does not interpret HTML in the text', () => {
    const wrapper = mount(PlainTextRenderer, { props: { text: '<b>bold</b>' } })

    expect(wrapper.find('b').exists()).toBe(false)
    expect(wrapper.find('pre').text()).toBe('<b>bold</b>')
  })
})
