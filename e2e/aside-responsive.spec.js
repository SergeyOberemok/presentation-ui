import { test, expect } from './support/fixtures'
import { mockSlides, mockSlideStream } from './support/mockApi'

// Below the lg breakpoint (1024px) the aside is an overlay drawer with a
// backdrop instead of the push layout.
test.use({ viewport: { width: 800, height: 700 } })

test('a chat slide opens the overlay drawer, and the backdrop closes it', async ({ page, app }) => {
  await mockSlides(page, [
    { type: 'text', value: 'Intro' },
    { type: 'file:md', value: 'notes.md' },
  ])
  await mockSlideStream(page, 'notes.md', [['# Notes']])
  await app.open()

  // Closed: the drawer isn't mounted at all.
  await expect(app.aside()).toHaveCount(0)

  await app.toChatSlide('notes.md')
  await expect(app.aside()).toHaveClass(/fixed/)
  const backdrop = page.locator('[class~="bg-black/40"]')
  await expect(backdrop).toBeVisible()

  // The backdrop covers the feed. Click its uncovered left edge.
  await backdrop.click({ position: { x: 10, y: 350 } })
  await expect(backdrop).toHaveCount(0)
  await expect(app.aside()).toHaveCount(0)
})
