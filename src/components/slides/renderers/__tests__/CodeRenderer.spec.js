import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CodeRenderer from '../CodeRenderer.vue'

describe('CodeRenderer', () => {
  it('highlights JSON content based on the filename extension', () => {
    const wrapper = mount(CodeRenderer, {
      props: { text: '{"name": "value"}', filename: 'data.json' },
    })

    expect(wrapper.find('pre.hljs').exists()).toBe(true)
    expect(wrapper.find('.hljs-attr').exists()).toBe(true)
    expect(wrapper.text()).toContain('"name"')
    expect(wrapper.text()).toContain('"value"')
  })

  it('highlights JavaScript, TypeScript, CSS and SCSS by extension', () => {
    const cases = [
      { filename: 'script.js', text: 'const foo = 1' },
      { filename: 'script.ts', text: 'const foo: number = 1' },
      { filename: 'styles.css', text: '.foo { color: red; }' },
      { filename: 'styles.scss', text: '.foo { color: red; }' },
    ]

    for (const { filename, text } of cases) {
      const wrapper = mount(CodeRenderer, { props: { text, filename } })
      expect(wrapper.find('pre.hljs code').exists()).toBe(true)
      expect(wrapper.find('pre.hljs .hljs-keyword, pre.hljs .hljs-selector-class').exists()).toBe(
        true,
      )
    }
  })

  it('renders unrecognized extensions as plain escaped text without highlighting', () => {
    const wrapper = mount(CodeRenderer, {
      props: { text: '<unknown>content</unknown>', filename: 'notes.unknown' },
    })

    expect(wrapper.find('pre.hljs').exists()).toBe(true)
    expect(wrapper.find('[class^="hljs-"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('<unknown>content</unknown>')
  })

  it('sanitizes rendered output', () => {
    const wrapper = mount(CodeRenderer, {
      props: { text: '<script>alert(1)</script>', filename: 'data.json' },
    })

    expect(wrapper.html()).not.toContain('<script>')
  })
})
