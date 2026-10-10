import { describe, it, expect, vi } from 'vitest'
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

  describe('tour stops', () => {
    it('emits the stop count when the text changes', async () => {
      const wrapper = render('==a==')
      await wrapper.setProps({ text: '==a==\n\n==b==' })

      expect(wrapper.emitted('steps')).toEqual([[1], [2]])
    })

    it('keeps the stop markup through sanitizing', () => {
      const wrapper = mount(MarkdownRenderer, { props: { text: '==a==\n\n==b==', activeStep: 1 } })

      const active = wrapper.find('.tour-step-active')
      expect(active.attributes('data-tour-step')).toBe('1')
      expect(active.find('mark').text()).toBe('b')
    })

    it('scrolls the active stop into view', async () => {
      const scrollIntoView = vi.fn()
      Element.prototype.scrollIntoView = scrollIntoView
      const wrapper = mount(MarkdownRenderer, { props: { text: '==a==\n\n==b==' } })

      await wrapper.setProps({ activeStep: 1 })

      expect(scrollIntoView).toHaveBeenCalledTimes(1)
      expect(scrollIntoView.mock.contexts[0].getAttribute('data-tour-step')).toBe('1')
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' })
      delete Element.prototype.scrollIntoView
    })
  })
})
