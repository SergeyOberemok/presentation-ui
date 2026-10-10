// markdown-it plugin that turns highlighted blocks into tour stops. A block
// (paragraph, list item, heading, table cell) that contains a `marker` token
// gets `data-tour-step="n"`. The block whose n equals `env.activeStep` also
// gets the `tour-step-active` class. The number of stops is written back to
// `env.stepCount`.
//
// Stops are blocks, not spans: several highlighted spans on one line make a
// single stop. `marker` is the opening token type that marks a stop. The
// default is 'mark_open' (==text==), which needs markdown-it-mark registered
// on the same instance. Any other inline token works, e.g. 'strong_open'
// (**text**).
//
// Fenced/indented code produces no inline children, so markers inside code
// never become stops.

export const TOUR_STEP_ATTR = 'data-tour-step'
export const TOUR_STEP_ACTIVE_CLASS = 'tour-step-active'

export function markdownTourSteps(md, { marker = 'mark_open' } = {}) {
  md.core.ruler.push('tour_steps', (state) => {
    const env = state.env ?? {}
    const openBlocks = []
    let count = 0

    for (const token of state.tokens) {
      if (token.nesting === 1) {
        openBlocks.push(token)
        continue
      }
      if (token.nesting === -1) {
        openBlocks.pop()
        continue
      }
      if (token.type !== 'inline' || !token.children?.some((child) => child.type === marker)) {
        continue
      }

      // Tight lists hide their paragraph_open, and hidden tokens aren't
      // rendered, so attributes set on them would be lost. In that case the
      // stop goes on the nearest visible block (the list item).
      const target = openBlocks.findLast((block) => !block.hidden)
      if (!target || target.attrGet(TOUR_STEP_ATTR) !== null) continue

      target.attrSet(TOUR_STEP_ATTR, String(count))
      if (count === env.activeStep) target.attrJoin('class', TOUR_STEP_ACTIVE_CLASS)
      count += 1
    }

    env.stepCount = count
  })
}
