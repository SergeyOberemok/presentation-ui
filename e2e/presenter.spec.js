import { test, expect } from './support/fixtures'
import { mockSlides, textSlides } from './support/mockApi'

// A presenter clicker (e.g. Logitech R400) is a keyboard: next/back send
// PageDown/PageUp, the blank-screen button sends '.'.
test.describe('presenter clicker keys', () => {
  test('PageDown / PageUp walk the tour like the arrow keys', async ({ page, app }) => {
    await mockSlides(page, textSlides(5))
    await app.open()

    for (const [key, index] of [
      ['PageDown', 1],
      ['PageDown', 2],
      ['PageUp', 1],
    ]) {
      await page.keyboard.press(key)
      await expect(app.current()).toHaveAttribute('data-slide-index', String(index))
    }
  })

  test("'.' blanks the screen and shows it again", async ({ page, app }) => {
    await mockSlides(page, textSlides(3))
    await app.open()
    const blank = page.locator('[data-presenter-blank]')

    await expect(blank).toHaveCount(0)
    await page.keyboard.press('.')
    await expect(blank).toBeVisible()
    await page.keyboard.press('.')
    await expect(blank).toHaveCount(0)
  })
})
