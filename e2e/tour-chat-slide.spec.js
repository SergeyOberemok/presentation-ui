import { test, expect } from './support/fixtures'
import { mockSlides, mockSlideStream } from './support/mockApi'

const NOTES_CHUNKS = [
  [
    '# Notes',
    '',
    '- first item',
    '- second item',
    '',
    '| key | value |',
    '| --- | --- |',
    '| a | 1 |',
  ],
  ['## Part two', '', 'The second chunk.'],
]

test.describe('file slides in the aside (chat destination)', () => {
  test('opens empty, streams one chunk per ArrowRight, then hands back to the tour', async ({
    page,
    app,
  }) => {
    await mockSlides(page, [
      { type: 'text', value: 'Intro' },
      { type: 'file:md', value: 'notes.md' },
      { type: 'text', value: 'Outro' },
    ])
    const stream = await mockSlideStream(page, 'notes.md', NOTES_CHUNKS)
    await app.open()

    const aside = app.aside()
    const body = app.asideBody()

    // Reaching the slide opens it, but nothing streams until the next press.
    await app.next()
    await expect(aside).not.toHaveAttribute('aria-hidden')
    await expect(body.getByRole('heading', { name: 'notes.md' })).toBeVisible()
    await expect(app.current()).toHaveCount(0)
    expect(stream.requests).toHaveLength(0)

    // First chunk, rendered as markdown. The tour stays on this slide.
    await app.next()
    await expect(body.getByRole('heading', { name: 'Notes', level: 1 })).toBeVisible()
    await expect(body.getByRole('listitem')).toHaveText(['first item', 'second item'])
    await expect(body.getByRole('cell', { name: 'a' })).toBeVisible()
    expect(stream.chunks()).toEqual([0])
    expect(stream.requests[0].searchParams.get('delay_ms')).toBe('10')
    await expect(app.current()).toHaveCount(0)

    // Second (last) chunk is appended below the first.
    await app.next()
    await expect(body.getByRole('heading', { name: 'Part two' })).toBeVisible()
    await expect(body.getByRole('heading', { name: 'Notes', level: 1 })).toBeVisible()
    expect(stream.chunks()).toEqual([0, 1])

    // Nothing left to stream: the next press moves the tour on and closes the aside.
    await app.next()
    await expect(app.current()).toHaveAttribute('data-slide-index', '2')
    await expect(aside).toHaveAttribute('aria-hidden', 'true')
    expect(stream.chunks()).toEqual([0, 1])
  })

  test('revisiting a chat slide opens a fresh, empty instance', async ({ page, app }) => {
    await mockSlides(page, [
      { type: 'text', value: 'Intro' },
      { type: 'file:md', value: 'notes.md' },
      { type: 'text', value: 'Outro' },
    ])
    const stream = await mockSlideStream(page, 'notes.md', [NOTES_CHUNKS[0]])
    await app.open()

    const body = app.asideBody()
    await app.toChatSlide('notes.md')
    await app.next()
    await expect(body.getByRole('heading', { name: 'Notes', level: 1 })).toBeVisible()
    await app.next()
    await expect(app.current()).toHaveAttribute('data-slide-index', '2')

    await app.toChatSlide('notes.md', 'ArrowLeft')
    await expect(app.aside()).not.toHaveAttribute('aria-hidden')
    await expect(body.getByRole('heading', { name: 'Notes', level: 1 })).toHaveCount(0)
    expect(stream.requests).toHaveLength(1)
  })

  test('renders a .js file as highlighted code', async ({ page, app }) => {
    await mockSlides(page, [
      { type: 'text', value: 'Intro' },
      { type: 'file:js', value: 'demo.js' },
    ])
    await mockSlideStream(page, 'demo.js', [['const answer = 42', 'console.log(answer)']])
    await app.open()

    await app.toChatSlide('demo.js')
    await app.next()
    const code = app.asideBody().locator('pre.hljs')
    await expect(code).toContainText('const answer = 42')
    await expect(code.locator('.hljs-keyword').first()).toHaveText('const')
  })

  test('falls back to plain text for an extension without a renderer', async ({ page, app }) => {
    await mockSlides(page, [
      { type: 'text', value: 'Intro' },
      { type: 'file:txt', value: 'readme.txt' },
    ])
    await mockSlideStream(page, 'readme.txt', [['# not a heading', '**not bold**']])
    await app.open()

    await app.toChatSlide('readme.txt')
    await app.next()
    const body = app.asideBody()
    await expect(body.locator('pre')).toHaveText('# not a heading\n**not bold**')
    await expect(body.locator('pre.hljs')).toHaveCount(0)
    await expect(body.getByRole('heading', { name: 'not a heading' })).toHaveCount(0)
  })

  test('moving between two chat slides swaps the aside content', async ({ page, app }) => {
    await mockSlides(page, [
      { type: 'text', value: 'Intro' },
      { type: 'file:md', value: 'notes.md' },
      { type: 'file:js', value: 'demo.js' },
    ])
    await mockSlideStream(page, 'notes.md', [NOTES_CHUNKS[0]])
    const js = await mockSlideStream(page, 'demo.js', [['const answer = 42']])
    await app.open()

    const body = app.asideBody()
    await app.toChatSlide('notes.md')
    await app.next()
    await expect(body.getByRole('heading', { name: 'Notes', level: 1 })).toBeVisible()

    await app.toChatSlide('demo.js')
    await expect(body.getByRole('heading', { name: 'notes.md' })).toHaveCount(0)
    await expect(app.aside()).not.toHaveAttribute('aria-hidden')
    expect(js.requests).toHaveLength(0)
  })
})
