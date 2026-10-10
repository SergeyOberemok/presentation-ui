import { describe, it, expect } from 'vitest'
import MarkdownIt from 'markdown-it'
import markdownItMark from 'markdown-it-mark'
import { markdownTourSteps } from '../markdownTourSteps'

function render(text, { activeStep = null, marker } = {}) {
  const md = new MarkdownIt()
    .use(markdownItMark)
    .use(markdownTourSteps, marker ? { marker } : undefined)
  const env = { activeStep }
  const html = md.render(text, env)
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return { doc, stepCount: env.stepCount }
}

const stopTags = (doc) =>
  [...doc.querySelectorAll('[data-tour-step]')].map((el) => [
    el.tagName.toLowerCase(),
    el.getAttribute('data-tour-step'),
  ])

describe('markdownTourSteps', () => {
  it('turns blocks with highlights into numbered stops, in document order', () => {
    const { doc, stepCount } = render(
      '# ==Title==\n\nplain\n\nsome ==marked== text\n\n| a | b |\n|---|---|\n| ==x== | y |',
    )

    expect(stepCount).toBe(3)
    expect(stopTags(doc)).toEqual([
      ['h1', '0'],
      ['p', '1'],
      ['td', '2'],
    ])
  })

  it('puts the stop on the list item for tight lists, whose paragraph is not rendered', () => {
    const { doc } = render('- one\n- ==two==\n- three')

    expect(stopTags(doc)).toEqual([['li', '0']])
  })

  it('counts several highlighted spans in one block as a single stop', () => {
    const { stepCount } = render('==a== and ==b== on one line')

    expect(stepCount).toBe(1)
  })

  it('leaves **bold** as plain styling, not a stop', () => {
    const { stepCount } = render('**bold** only')

    expect(stepCount).toBe(0)
  })

  it('ignores markers inside code', () => {
    const { stepCount } = render(
      '```md\n==not a stop==\n```\n\n    ==nor this==\n\n`==inline code==`',
    )

    expect(stepCount).toBe(0)
  })

  it('marks only the active stop with the active class', () => {
    const { doc } = render('==a==\n\n==b==', { activeStep: 1 })

    const active = [...doc.querySelectorAll('.tour-step-active')]
    expect(active.map((el) => el.getAttribute('data-tour-step'))).toEqual(['1'])
  })

  it('uses a configurable marker token', () => {
    const { stepCount } = render('**bold**\n\n==marked==', { marker: 'strong_open' })

    expect(stepCount).toBe(1)
  })

  it('gives a tight list item holding several highlighted blocks a single stop', () => {
    const { doc, stepCount } = render('- ==a==\n  ```\n  x\n  ```\n  ==b==\n- ==c==')

    expect(stopTags(doc)).toEqual([
      ['li', '0'],
      ['li', '1'],
    ])
    expect(stepCount).toBe(2)
  })

  it('copes with a parse state that has no env', () => {
    const md = new MarkdownIt().use(markdownItMark).use(markdownTourSteps)

    expect(() => md.core.process(new md.core.State('==a==', md, undefined))).not.toThrow()
  })
})
