import { test as base, expect } from '@playwright/test'

// Page helpers shared by the specs. The tour listens on window (VueUse
// onKeyStroke), so key presses need no focused element.
export const test = base.extend({
  app: async ({ page }, use) => {
    const currentSlide = page.locator('[data-slide-index][aria-current="step"]')

    await use({
      // Opens the app and waits for page 1 to render, so the tour has data
      // before the first key press.
      async open() {
        await page.goto('/')
        await expect(page.locator('[data-slide-index]').first()).toBeVisible()
      },
      feedItems: () => page.locator('[data-slide-index]'),
      slide: (index) => page.locator(`[data-slide-index="${index}"]`),
      // The feed item the tour is on. Chat slides have no feed item.
      current: () => currentSlide,
      aside: () => page.locator('aside'),
      // The aside's body (below its header), where opened slides render.
      // Located by its data attribute, so the aside's wrapper markup (which
      // differs between the push and overlay layouts) doesn't matter.
      asideBody: () => page.locator('aside [data-aside-body]'),
      next: () => page.keyboard.press('ArrowRight'),
      prev: () => page.keyboard.press('ArrowLeft'),
      // Press ArrowRight / ArrowLeft and wait for the tour to land on feed
      // slide `index`. goTo() drops presses that arrive while it's still
      // navigating, so multi-step walks must wait after every press.
      async nextTo(index) {
        await page.keyboard.press('ArrowRight')
        await expect(currentSlide).toHaveAttribute('data-slide-index', String(index))
      },
      async prevTo(index) {
        await page.keyboard.press('ArrowLeft')
        await expect(currentSlide).toHaveAttribute('data-slide-index', String(index))
      },
      // Presses ArrowRight (or ArrowLeft) and waits until the aside shows the
      // file slide `filename`. Key presses made while the tour is still
      // navigating are dropped, so wait before pressing again.
      async toChatSlide(filename, key = 'ArrowRight') {
        await page.keyboard.press(key)
        await expect(
          page.locator('aside').getByRole('heading', { name: filename, exact: true }),
        ).toBeVisible()
      },
    })
  },
})

export { expect }
