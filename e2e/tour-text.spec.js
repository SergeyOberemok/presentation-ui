import { test, expect } from './support/fixtures'
import { mockSlides, textSlides } from './support/mockApi'

test.describe('guided tour over text slides', () => {
  test('ArrowRight / ArrowLeft move between slides and keep the current one in view', async ({
    page,
    app,
  }) => {
    await mockSlides(page, textSlides(30))
    await app.open()

    await expect(app.current()).toHaveAttribute('data-slide-index', '0')

    for (let i = 1; i <= 15; i++) await app.nextTo(i)
    await expect(app.slide(15)).toBeInViewport()
    await expect(app.slide(0)).not.toBeInViewport()

    for (let i = 14; i >= 0; i--) await app.prevTo(i)
    await expect(app.slide(0)).toBeInViewport()
  })

  test('stays put at the first and the last slide', async ({ page, app }) => {
    await mockSlides(page, textSlides(3))
    await app.open()

    await app.prevTo(0)
    await app.nextTo(1)
    await app.nextTo(2)
    await app.nextTo(2)
    await app.prevTo(1)
  })

  test('crosses a page boundary, loading the next page on demand', async ({ page, app }) => {
    const requestedPages = await mockSlides(page, textSlides(25), { pageSize: 10 })
    await app.open()

    for (let i = 1; i <= 24; i++) await app.nextTo(i)
    await expect(app.slide(24)).toBeInViewport()

    // The sentinels and the tour may both ask for a page; the store's
    // single-flight loads make sure each page is fetched only once.
    expect(requestedPages).toEqual([1, 2, 3])
  })

  test('ignores arrow keys while an editable element has focus', async ({ page, app }) => {
    await mockSlides(page, textSlides(3))
    await app.open()

    // The app has no inputs of its own.
    await page.evaluate(() => {
      const input = document.createElement('input')
      input.id = 'e2e-input'
      document.body.append(input)
    })
    await page.locator('#e2e-input').focus()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')

    await page.locator('#e2e-input').blur()
    // Had either press above moved the tour, this one would land on 2 or 3.
    await app.nextTo(1)
  })
})
