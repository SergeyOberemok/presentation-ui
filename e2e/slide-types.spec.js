import { test, expect } from './support/fixtures'
import { mockSlideFiles, mockSlides } from './support/mockApi'

const IMAGE_SLIDE = {
  title: 'funny image',
  type: 'image:png',
  destination: 'main',
  value: 'Screenshot (1).png',
  url: '/slide-resources/files/Screenshot%20%281%29.png',
}

const MARKDOWN_SLIDE = {
  type: 'text',
  value:
    '### The quarterly results look great!\n\n- Revenue was off the chart.\n- Profits were higher than ever.\n\n  _Everything_ is going according to **plan**.',
}

test.describe('slide types', () => {
  test('an image slide shows its image and caption, and the tour walks past it', async ({
    page,
    app,
  }) => {
    await mockSlides(page, [{ type: 'text', value: 'Start' }, IMAGE_SLIDE, MARKDOWN_SLIDE])
    const requests = await mockSlideFiles(page)
    await app.open()

    await app.nextTo(1)
    const image = app.slide(1).getByRole('img', { name: 'funny image' })
    await expect(image).toBeVisible()
    // Loaded, not just in the DOM.
    await expect.poll(() => image.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
    await expect(app.slide(1).locator('figcaption')).toHaveText('funny image')
    expect(requests).toContain('/slide-resources/files/Screenshot%20%281%29.png')

    await app.nextTo(2)
    await app.prevTo(1)
  })

  test('an image that fails to load shows a fallback', async ({ page, app }) => {
    await mockSlides(page, [IMAGE_SLIDE])
    await mockSlideFiles(page, { missing: ['Screenshot (1).png'] })
    await app.open()

    await expect(app.slide(0).getByRole('alert')).toHaveText('Image failed to load.')
  })

  test('a text slide renders markdown', async ({ page, app }) => {
    await mockSlides(page, [MARKDOWN_SLIDE])
    await app.open()

    const slide = app.slide(0)
    await expect(
      slide.getByRole('heading', { level: 3, name: 'The quarterly results look great!' }),
    ).toBeVisible()
    await expect(slide.getByRole('listitem')).toHaveCount(2)
    await expect(slide.locator('em')).toHaveText('Everything')
    await expect(slide.locator('strong')).toHaveText('plan')
  })
})
