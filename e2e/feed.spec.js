import { test, expect } from './support/fixtures'
import { mockSlides, mockSlideStream, textSlides } from './support/mockApi'

test.describe('slide feed', () => {
  test('renders page 1 text slides in order with their index', async ({ page, app }) => {
    await mockSlides(page, textSlides(3))
    await app.open()

    await expect(app.feedItems()).toHaveText(['Slide 0#0', 'Slide 1#1', 'Slide 2#2'])
  })

  test('renders file:json inline and leaves other file slides out of the feed', async ({
    page,
    app,
  }) => {
    await mockSlides(page, [
      { type: 'text', value: 'Intro' },
      { type: 'file:md', value: 'notes.md' },
      { type: 'file:js', value: 'demo.js' },
      { type: 'file:json', value: 'data.json' },
    ])
    await app.open()

    // Indices stay global: the chat slides keep 1 and 2 even though they're
    // not rendered here.
    await expect(app.feedItems()).toHaveCount(2)
    await expect(app.slide(0)).toContainText('Intro')
    await expect(app.slide(1)).toHaveCount(0)
    await expect(app.slide(2)).toHaveCount(0)
    await expect(app.slide(3)).toContainText('data.json')
  })

  test('renders a file:json slide with highlighted code once the tour reaches it', async ({
    page,
    app,
  }) => {
    await mockSlides(page, [{ type: 'file:json', value: 'data.json' }])
    await mockSlideStream(page, 'data.json', [['{', '  "answer": 42', '}']])
    await app.open()

    const code = app.slide(0).locator('pre.hljs')
    await expect(code).toContainText('"answer": 42')
    await expect(code.locator('.hljs-attr')).toHaveText('"answer"')
  })

  test('loads further pages as the feed is scrolled, and stops at the last one', async ({
    page,
    app,
  }) => {
    const requestedPages = await mockSlides(page, textSlides(45))
    await app.open()

    // Page 1 alone may already fill past the sentinel margin on a tall
    // viewport, so scroll until the last slide shows up.
    await expect(async () => {
      await app.feedItems().last().scrollIntoViewIfNeeded()
      await expect(app.slide(44)).toBeAttached({ timeout: 500 })
    }).toPass()

    await expect(app.feedItems()).toHaveCount(45)
    expect(requestedPages).toEqual([1, 2, 3])
  })

  test('shows an error when a page fails to load and stops requesting it', async ({
    page,
    app,
  }) => {
    const requestedPages = await mockSlides(page, textSlides(45), { failPages: [2] })
    await app.open()

    await app.feedItems().last().scrollIntoViewIfNeeded()
    await expect(page.getByText('Failed to load more.')).toBeVisible()
    await expect(app.feedItems()).toHaveCount(20)
    expect(requestedPages.filter((p) => p === 2)).toHaveLength(1)
  })

  test('clicking a slide opens its details in the aside; close button and Escape close it', async ({
    page,
    app,
  }) => {
    await mockSlides(page, textSlides(3))
    await app.open()

    const aside = app.aside()
    await expect(aside).toHaveAttribute('aria-hidden', 'true')

    await app.slide(1).click()
    await expect(aside).not.toHaveAttribute('aria-hidden')
    await expect(aside.getByRole('heading', { name: 'Slide Detail' })).toBeVisible()
    await expect(aside).toContainText('#1')
    await expect(aside).toContainText('Slide 1')

    await aside.getByRole('button', { name: 'Close panel' }).click()
    await expect(aside).toHaveAttribute('aria-hidden', 'true')
    await expect(aside).toHaveAttribute('inert')

    await app.slide(2).click()
    await expect(aside).toContainText('Slide 2')
    await page.keyboard.press('Escape')
    await expect(aside).toHaveAttribute('aria-hidden', 'true')
  })
})
