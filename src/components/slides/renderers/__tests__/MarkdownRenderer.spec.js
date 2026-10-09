import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MarkdownRenderer from '../MarkdownRenderer.vue'

// Slide files come from the backend and are rendered with v-html, so the
// sanitising is a security boundary, not a nicety.
describe('MarkdownRenderer', () => {
  function render(text) {
    return mount(MarkdownRenderer, { props: { text } })
  }

  it('renders markdown to HTML', () => {
    const wrapper = render('# Title\n\nSome **bold** text')

    expect(wrapper.find('h1').text()).toBe('Title')
    expect(wrapper.find('strong').text()).toBe('bold')
  })

  it('does not render raw HTML from the source', () => {
    const wrapper = render('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">')

    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('drops javascript: links', () => {
    const wrapper = render('[click](javascript:alert(1))')

    const link = wrapper.find('a')
    expect(link.exists() ? link.attributes('href') : undefined).toBeUndefined()
  })

  it('keeps ordinary links', () => {
    const wrapper = render('[docs](https://example.com)')

    expect(wrapper.find('a').attributes('href')).toBe('https://example.com')
  })
})
