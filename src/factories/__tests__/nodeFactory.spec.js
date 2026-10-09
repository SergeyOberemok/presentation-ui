import { describe, it, expect } from 'vitest'
import TextNode from '@/components/TextNode.vue'
import SlideTextStream from '@/components/slides/SlideTextStream.vue'
import { resolveNodeDescriptor } from '../nodeFactory'

describe('resolveNodeDescriptor', () => {
  it('resolves a text node to TextNode, defaulting destination to main', () => {
    const descriptor = resolveNodeDescriptor({ type: 'text', value: 'hello', index: 0 })

    expect(descriptor.component).toBe(TextNode)
    expect(descriptor.props).toEqual({ value: 'hello' })
    expect(descriptor.destination).toBe('main')
  })

  it('resolves a file:md node to SlideTextStream with the value as filename', () => {
    const descriptor = resolveNodeDescriptor({
      type: 'file:md',
      destination: 'chat',
      value: 'notes.md',
      index: 3,
    })

    expect(descriptor.component).toBe(SlideTextStream)
    expect(descriptor.props).toEqual({ filename: 'notes.md', index: 3, autoStart: false })
    expect(descriptor.destination).toBe('chat')
  })

  it('defaults a file node with no explicit destination to chat', () => {
    // The backend currently sends file nodes as just { type, value }, with
    // no destination field at all.
    const descriptor = resolveNodeDescriptor({ type: 'file:md', value: 'notes.md' })

    expect(descriptor.destination).toBe('chat')
  })

  it('defaults a file:json node with no explicit destination to main', () => {
    // file:json has no inline/aside split from the backend either, but it's
    // meant to render as a code slide in the main feed rather than the aside.
    const descriptor = resolveNodeDescriptor({ type: 'file:json', value: 'test.json', index: 2 })

    expect(descriptor.component).toBe(SlideTextStream)
    expect(descriptor.props).toEqual({ filename: 'test.json', index: 2, autoStart: true })
    expect(descriptor.destination).toBe('main')
  })

  it('respects an explicit destination override on a file node', () => {
    const descriptor = resolveNodeDescriptor({
      type: 'file:md',
      value: 'notes.md',
      destination: 'main',
    })

    expect(descriptor.destination).toBe('main')
    expect(descriptor.props.autoStart).toBe(true) // streams inline like file:json
  })

  it('respects an explicit destination override on a file:json node', () => {
    const descriptor = resolveNodeDescriptor({
      type: 'file:json',
      value: 'test.json',
      destination: 'chat',
    })

    expect(descriptor.destination).toBe('chat')
    expect(descriptor.props.autoStart).toBe(false) // aside waits for ArrowRight
  })

  it('falls back to the text resolver for an unknown type', () => {
    const descriptor = resolveNodeDescriptor({ type: 'mystery', value: 'x' })

    expect(descriptor.component).toBe(TextNode)
    expect(descriptor.props).toEqual({ value: 'x' })
  })

  it('defaults a missing type to text', () => {
    const descriptor = resolveNodeDescriptor({ value: 'x' })

    expect(descriptor.component).toBe(TextNode)
  })

  it('falls back to main when a resolver has no defaultDestination and the node has no explicit one', () => {
    // Guards against a future TYPE_RESOLVERS entry forgetting to declare
    // defaultDestination, which would otherwise silently resolve to
    // `undefined` and make the node vanish from both the feed and the tour.
    const descriptor = resolveNodeDescriptor({ type: 'mystery', value: 'x' })

    expect(descriptor.destination).toBe('main')
  })
})
