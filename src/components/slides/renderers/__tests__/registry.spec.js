import { describe, expect, it } from 'vitest'
import { resolveSlideRenderer } from '../index.js'
import MarkdownRenderer from '../MarkdownRenderer.vue'
import PlainTextRenderer from '../PlainTextRenderer.vue'
import CodeRenderer from '../CodeRenderer.vue'

describe('resolveSlideRenderer', () => {
  it('resolves markdown files to MarkdownRenderer', () => {
    expect(resolveSlideRenderer('notes.md')).toBe(MarkdownRenderer)
  })

  it('is case-insensitive on the extension', () => {
    expect(resolveSlideRenderer('notes.MD')).toBe(MarkdownRenderer)
  })

  it('resolves code files to CodeRenderer', () => {
    expect(resolveSlideRenderer('script.js')).toBe(CodeRenderer)
    expect(resolveSlideRenderer('script.ts')).toBe(CodeRenderer)
    expect(resolveSlideRenderer('data.json')).toBe(CodeRenderer)
    expect(resolveSlideRenderer('style.css')).toBe(CodeRenderer)
    expect(resolveSlideRenderer('style.scss')).toBe(CodeRenderer)
  })

  it('is case-insensitive for code file extensions', () => {
    expect(resolveSlideRenderer('data.JSON')).toBe(CodeRenderer)
  })

  it('falls back to PlainTextRenderer for unimplemented types', () => {
    expect(resolveSlideRenderer('notes.txt')).toBe(PlainTextRenderer)
  })

  it('falls back to PlainTextRenderer for missing/invalid filenames', () => {
    expect(resolveSlideRenderer(undefined)).toBe(PlainTextRenderer)
    expect(resolveSlideRenderer('')).toBe(PlainTextRenderer)
  })
})
