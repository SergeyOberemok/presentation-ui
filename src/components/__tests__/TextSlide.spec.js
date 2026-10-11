import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TextSlide from '../TextSlide.vue'

describe('TextSlide', () => {
  it('renders its value as markdown', () => {
    const wrapper = mount(TextSlide, {
      props: {
        value:
          '### The quarterly results look great!\n\n- Revenue was off the chart.\n- Profits were higher than ever.\n\n  _Everything_ is going according to **plan**.',
      },
    })

    expect(wrapper.find('h3').text()).toBe('The quarterly results look great!')
    const items = wrapper.findAll('li')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toBe('Revenue was off the chart.')
    // The indented line is a continuation paragraph of the second item.
    expect(items[1].text()).toContain('Profits were higher than ever.')
    expect(wrapper.find('em').text()).toBe('Everything')
    expect(wrapper.find('strong').text()).toBe('plan')
  })

  it('renders a plain string as a single paragraph', () => {
    const wrapper = mount(TextSlide, { props: { value: 'Main title' } })

    expect(wrapper.find('p').text()).toBe('Main title')
  })

  it('does not render raw HTML from the value', () => {
    const wrapper = mount(TextSlide, { props: { value: '<script>alert(1)</script>' } })

    expect(wrapper.find('script').exists()).toBe(false)
  })
})
