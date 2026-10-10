import { test, expect } from './support/fixtures'
import { mockSlides, mockSlideStream, textSlides } from './support/mockApi'

// Enough text slides ahead of the json slide to push it below the fold.
const JSON_INDEX = 15
const SLIDES = [
  ...textSlides(JSON_INDEX),
  { type: 'file:json', value: 'data.json' },
  { type: 'text', value: 'After' },
]
const JSON_CHUNKS = [
  ['{', '  "first": 1,'],
  ['  "second": 2', '}'],
]

test.describe('file:json slide in the main feed', () => {
  test('mounts ahead of the tour but streams only once the tour reaches it', async ({
    page,
    app,
  }) => {
    await mockSlides(page, SLIDES)
    const stream = await mockSlideStream(page, 'data.json', JSON_CHUNKS)
    await app.open()

    const slide = app.slide(JSON_INDEX)
    await expect(slide.getByRole('heading', { name: 'data.json' })).toBeAttached()
    await expect(slide).not.toBeInViewport()

    for (let i = 1; i < JSON_INDEX; i++) await app.nextTo(i)
    expect(stream.requests).toHaveLength(0)

    // Arriving auto-starts chunk 0 inline; the aside stays closed.
    await app.nextTo(JSON_INDEX)
    await expect(slide.locator('pre.hljs')).toContainText('"first": 1')
    await expect(slide).toBeInViewport()
    await expect(app.aside()).toHaveAttribute('aria-hidden', 'true')
    expect(stream.chunks()).toEqual([0])
  })

  test('ArrowRight fetches the remaining chunks before the tour moves on', async ({
    page,
    app,
  }) => {
    await mockSlides(page, SLIDES)
    const stream = await mockSlideStream(page, 'data.json', JSON_CHUNKS)
    await app.open()

    for (let i = 1; i <= JSON_INDEX; i++) await app.nextTo(i)
    const code = app.slide(JSON_INDEX).locator('pre.hljs')
    await expect(code).toContainText('"first": 1')

    await app.next()
    await expect(code).toContainText('"second": 2')
    await expect(app.current()).toHaveAttribute('data-slide-index', String(JSON_INDEX))
    expect(stream.chunks()).toEqual([0, 1])

    await app.nextTo(JSON_INDEX + 1)

    // A fully streamed inline slide keeps its content and no longer holds
    // the arrow keys, so revisiting it passes straight through.
    await app.prevTo(JSON_INDEX)
    await expect(code).toContainText('"second": 2')
    await app.prevTo(JSON_INDEX - 1)
    expect(stream.chunks()).toEqual([0, 1])
  })
})
