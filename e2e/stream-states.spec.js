import { test, expect } from './support/fixtures'
import { mockSlides, mockSlideStream } from './support/mockApi'

const SLIDES = [
  { type: 'text', value: 'Intro' },
  { type: 'file:md', value: 'stream.md' },
  { type: 'text', value: 'Outro' },
]

test.describe('streamed slide states', () => {
  test.beforeEach(async ({ page }) => {
    await mockSlides(page, SLIDES)
  })

  test('shows a streaming indicator and swallows ArrowRight while a chunk is in flight', async ({
    page,
    app,
  }) => {
    const stream = await mockSlideStream(page, 'stream.md', [['# Held back']], { holdChunk: 0 })
    await app.open()

    const body = app.asideBody()
    const indicator = body.locator('.animate-pulse')

    await app.toChatSlide('stream.md')
    await app.next()
    await expect.poll(() => stream.requests.length).toBe(1)
    await expect(indicator).toBeVisible()

    // Neither a second request nor a tour move.
    await app.next()
    await expect(indicator).toBeVisible()
    await expect(app.aside()).not.toHaveAttribute('aria-hidden')
    expect(stream.requests).toHaveLength(1)

    stream.release()
    await expect(body.getByRole('heading', { name: 'Held back' })).toBeVisible()
    await expect(indicator).toHaveCount(0)
  })

  test('reports a dropped connection and retries the same chunk on ArrowRight', async ({
    page,
    app,
  }) => {
    const stream = await mockSlideStream(
      page,
      'stream.md',
      [['# Retried', '', 'Only once.'], ['Second chunk.']],
      { failChunk: 0 },
    )
    await app.open()

    const body = app.asideBody()
    await app.toChatSlide('stream.md')
    await app.next()
    await expect(body.getByText('Connection lost while streaming.')).toBeVisible()

    await app.next()
    await expect(body.getByRole('heading', { name: 'Retried' })).toHaveCount(1)
    await expect(body.getByText('Only once.')).toHaveCount(1)
    await expect(body.getByText('Connection lost while streaming.')).toHaveCount(0)
    expect(stream.chunks()).toEqual([0, 0])

    await app.next()
    await expect(body.getByText('Second chunk.')).toBeVisible()
    expect(stream.chunks()).toEqual([0, 0, 1])
  })

  test('renders HTML in streamed markdown as text, not markup', async ({ page, app }) => {
    const dialogs = []
    page.on('dialog', (dialog) => {
      dialogs.push(dialog.message())
      return dialog.dismiss()
    })
    await mockSlideStream(page, 'stream.md', [
      [
        '# Unsafe',
        '',
        '<img src="x" onerror="window.__xss = true; alert(1)">',
        '',
        '<script>window.__xss = true</script>',
        '',
        '[link](javascript:alert(1))',
      ],
    ])
    await app.open()

    const body = app.asideBody()
    await app.toChatSlide('stream.md')
    await app.next()
    await expect(body.getByRole('heading', { name: 'Unsafe' })).toBeVisible()

    await expect(body.getByText('<img src="x" onerror=')).toBeVisible()
    await expect(body.locator('img, script')).toHaveCount(0)
    await expect(body.locator('a[href^="javascript:"]')).toHaveCount(0)
    expect(await page.evaluate(() => window.__xss)).toBeUndefined()
    expect(dialogs).toEqual([])
  })
})
