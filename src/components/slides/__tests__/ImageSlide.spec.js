import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ImageSlide from '../ImageSlide.vue'

describe('ImageSlide', () => {
  it('shows the image with its title as alt text and caption', () => {
    const wrapper = mount(ImageSlide, { props: { src: '/img.png', title: 'funny image' } })

    const img = wrapper.find('img')
    expect(img.attributes('src')).toBe('/img.png')
    expect(img.attributes('alt')).toBe('funny image')
    expect(wrapper.find('figcaption').text()).toBe('funny image')
  })

  it('has no caption without a title', () => {
    const wrapper = mount(ImageSlide, { props: { src: '/img.png' } })

    expect(wrapper.find('img').attributes('alt')).toBe('')
    expect(wrapper.find('figcaption').exists()).toBe(false)
  })

  it('shows a fallback when the image fails, and retries on a new src', async () => {
    const wrapper = mount(ImageSlide, { props: { src: '/missing.png' } })

    await wrapper.find('img').trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('[role="alert"]').text()).toBe('Image failed to load.')

    await wrapper.setProps({ src: '/other.png' })
    expect(wrapper.find('img').attributes('src')).toBe('/other.png')
  })
})
