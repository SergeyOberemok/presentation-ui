import { test, expect } from './support/fixtures'
import { mockSlides, mockSlideStream } from './support/mockApi'

// Three stops in chunk 0 (a paragraph, a list item, a table cell) plus
// **bold**, which is styling only. One more stop in chunk 1.
const STEP_CHUNKS = [
  [
    '# Steps',
    '',
    'Intro with ==first stop== here.',
    '',
    '- plain item',
    '- item with ==second stop==',
    '',
    '| col | note |',
    '| --- | --- |',
    '| x | ==third stop== |',
    '',
    'Some **bold** text.',
  ],
  ['', 'Closing ==fourth stop==.'],
]

const SLIDES = [
  { type: 'text', value: 'Intro' },
  { type: 'file:md', value: 'steps.md' },
  { type: 'text', value: 'Outro' },
]

test.describe('markdown tour stops', () => {
  test.beforeEach(async ({ page }) => {
    await mockSlides(page, SLIDES)
  })

  // Exactly one active stop, the expected one, in view.
  async function expectActiveStop(app, text) {
    const active = app.asideBody().locator('.tour-step-active')
    await expect(active).toHaveCount(1)
    await expect(active).toContainText(text)
    await expect(active).toBeInViewport()
  }

  test('walks the stops of a chunk before fetching the next one', async ({ page, app }) => {
    const stream = await mockSlideStream(page, 'steps.md', STEP_CHUNKS)
    await app.open()

    const body = app.asideBody()
    await app.toChatSlide('steps.md')
    await app.next()

    await expect(body.getByRole('heading', { name: 'Steps', exact: true })).toBeVisible()
    await expect(body.locator('[data-tour-step]')).toHaveCount(3)
    await expect(body.locator('.tour-step-active')).toHaveCount(0)
    await expect(body.locator('strong')).toHaveText('bold')

    await app.next()
    await expectActiveStop(app, 'first stop')
    await expect(body.locator('[data-tour-step="0"]')).toHaveRole('paragraph')
    await app.next()
    await expectActiveStop(app, 'second stop')
    await expect(body.locator('[data-tour-step="1"]')).toHaveRole('listitem')
    await app.next()
    await expectActiveStop(app, 'third stop')
    await expect(body.locator('[data-tour-step="2"]')).toHaveRole('cell')
    expect(stream.chunks()).toEqual([0])

    // Out of stops: fetch chunk 1 and clear the highlight.
    await app.next()
    await expect(body.getByText('Closing')).toBeVisible()
    await expect(body.locator('[data-tour-step]')).toHaveCount(4)
    await expect(body.locator('.tour-step-active')).toHaveCount(0)
    expect(stream.chunks()).toEqual([0, 1])

    // The walk continues with the new stop, not from the start.
    await app.next()
    await expectActiveStop(app, 'fourth stop')

    // Everything streamed and visited: the tour moves on.
    await app.next()
    await expect(app.current()).toHaveAttribute('data-slide-index', '2')
    await expect(app.aside()).toHaveAttribute('aria-hidden', 'true')
  })

  test('ArrowLeft walks the stops back, then hands control to the tour', async ({ page, app }) => {
    await mockSlideStream(page, 'steps.md', STEP_CHUNKS)
    await app.open()

    await app.toChatSlide('steps.md')
    await app.next()
    await expect(app.asideBody().locator('[data-tour-step]')).toHaveCount(3)

    await app.next()
    await app.next()
    await expectActiveStop(app, 'second stop')

    await app.prev()
    await expectActiveStop(app, 'first stop')

    await app.prev()
    await expect(app.current()).toHaveAttribute('data-slide-index', '0')
    await expect(app.aside()).toHaveAttribute('aria-hidden', 'true')
  })

  test('ArrowLeft after a chunk fetch re-shows the last visited stop', async ({ page, app }) => {
    await mockSlideStream(page, 'steps.md', STEP_CHUNKS)
    await app.open()

    const body = app.asideBody()
    await app.toChatSlide('steps.md')
    await app.next()
    await expect(body.locator('[data-tour-step]')).toHaveCount(3)
    for (const text of ['first stop', 'second stop', 'third stop']) {
      await app.next()
      await expectActiveStop(app, text)
    }

    await app.next()
    await expect(body.locator('[data-tour-step]')).toHaveCount(4)
    await expect(body.locator('.tour-step-active')).toHaveCount(0)

    await app.prev()
    await expectActiveStop(app, 'third stop')
  })
})
