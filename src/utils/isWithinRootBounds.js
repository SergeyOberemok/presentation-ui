// IntersectionObserver only notifies on threshold crossings, not on every
// layout change while already intersecting - so content that grows while a
// sentinel stays inside the (margin-expanded) root bounds won't retrigger the
// callback. Callers that need to keep loading until a sentinel is actually
// out of view should poll this between loads instead of relying on another
// observer notification.
export function isWithinRootBounds(target, root, margin = 0) {
  if (!target || !root) return false

  const targetRect = target.getBoundingClientRect()
  const rootRect = root.getBoundingClientRect()

  return targetRect.top < rootRect.bottom + margin && targetRect.bottom > rootRect.top - margin
}
