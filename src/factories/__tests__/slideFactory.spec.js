import { describe, it, expect } from 'vitest'
import TextSlide from '@/components/TextSlide.vue'
import ImageSlide from '@/components/slides/ImageSlide.vue'
import SlideTextStream from '@/components/slides/SlideTextStream.vue'
import { resolveSlideDescriptor } from '../slideFactory'

describe('resolveSlideDescriptor', () => {
  it('resolves a text slide to TextSlide, defaulting destination to main', () => {
    const descriptor = resolveSlideDescriptor({ type: 'text', value: 'hello', index: 0 })

    expect(descriptor.component).toBe(TextSlide)
    expect(descriptor.props).toEqual({ value: 'hello' })
    expect(descriptor.destination).toBe('main')
  })

  it('resolves a file:md slide to SlideTextStream with the value as filename', () => {
    const descriptor = resolveSlideDescriptor({
      type: 'file:md',
      destination: 'chat',
      value: 'notes.md',
      index: 3,
    })

    expect(descriptor.component).toBe(SlideTextStream)
    expect(descriptor.props).toEqual({
      filename: 'notes.md',
      index: 3,
      autoStart: false,
      followStream: true,
    })
    expect(descriptor.destination).toBe('chat')
  })

  it('defaults a file slide with no explicit destination to chat', () => {
    // The backend currently sends file slides as just { type, value }, with
    // no destination field at all.
    const descriptor = resolveSlideDescriptor({ type: 'file:md', value: 'notes.md' })

    expect(descriptor.destination).toBe('chat')
  })

  it('defaults a file:json slide with no explicit destination to main', () => {
    // file:json has no inline/aside split from the backend either, but it's
    // meant to render as a code slide in the main feed rather than the aside.
    const descriptor = resolveSlideDescriptor({ type: 'file:json', value: 'test.json', index: 2 })

    expect(descriptor.component).toBe(SlideTextStream)
    expect(descriptor.props).toEqual({
      filename: 'test.json',
      index: 2,
      autoStart: true,
      followStream: false,
    })
    expect(descriptor.destination).toBe('main')
  })

  it('respects an explicit destination override on a file slide', () => {
    const descriptor = resolveSlideDescriptor({
      type: 'file:md',
      value: 'notes.md',
      destination: 'main',
    })

    expect(descriptor.destination).toBe('main')
    expect(descriptor.props.autoStart).toBe(true) // streams inline like file:json
    expect(descriptor.props.followStream).toBe(false) // stays centered in the feed
  })

  it('respects an explicit destination override on a file:json slide', () => {
    const descriptor = resolveSlideDescriptor({
      type: 'file:json',
      value: 'test.json',
      destination: 'chat',
    })

    expect(descriptor.destination).toBe('chat')
    expect(descriptor.props.autoStart).toBe(false) // aside waits for ArrowRight
    expect(descriptor.props.followStream).toBe(true) // aside follows the newest line
  })

  it('resolves an image slide to ImageSlide, using the url the backend sends', () => {
    const descriptor = resolveSlideDescriptor({
      title: 'funny image',
      type: 'image:png',
      destination: 'main',
      value: 'Screenshot (1).png',
      url: '/slide-resources/files/Screenshot%20%281%29.png',
    })

    expect(descriptor.component).toBe(ImageSlide)
    expect(descriptor.props).toEqual({
      src: '/slide-resources/files/Screenshot%20%281%29.png',
      title: 'funny image',
    })
    expect(descriptor.destination).toBe('main')
  })

  it('builds the image url from the value when the slide has none', () => {
    const descriptor = resolveSlideDescriptor({ type: 'image:png', value: 'a b.png' })

    expect(descriptor.props).toEqual({ src: '/slide-resources/files/a%20b.png', title: null })
    expect(descriptor.destination).toBe('main')
  })

  it('falls back to the text resolver for an unknown type', () => {
    const descriptor = resolveSlideDescriptor({ type: 'mystery', value: 'x' })

    expect(descriptor.component).toBe(TextSlide)
    expect(descriptor.props).toEqual({ value: 'x' })
  })

  it('defaults a missing type to text', () => {
    const descriptor = resolveSlideDescriptor({ value: 'x' })

    expect(descriptor.component).toBe(TextSlide)
  })

  it('falls back to main when a resolver has no defaultDestination and the slide has no explicit one', () => {
    // Guards against a future TYPE_RESOLVERS entry forgetting to declare
    // defaultDestination, which would otherwise silently resolve to
    // `undefined` and make the slide vanish from both the feed and the tour.
    const descriptor = resolveSlideDescriptor({ type: 'mystery', value: 'x' })

    expect(descriptor.destination).toBe('main')
  })
})
