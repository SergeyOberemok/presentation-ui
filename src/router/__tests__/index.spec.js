import { describe, expect, it } from 'vitest'
import router from '../index'

describe('router', () => {
  it('has a single "main" route at /', () => {
    const routes = router.getRoutes()

    expect(routes).toHaveLength(1)
    expect(routes[0]).toMatchObject({ name: 'main', path: '/' })
  })

  it('lazy-loads the Main view', async () => {
    const [route] = router.getRoutes()

    const module = await route.components.default()

    expect(module.default).toBeTruthy()
  })

  it('resolves / to the main route', () => {
    expect(router.resolve('/').name).toBe('main')
  })
})
