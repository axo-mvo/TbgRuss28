// Client-side parent-child conflict detection for the group builder.
// Provides immediate UI feedback before the database constraint check.

/**
 * Build a Map from parentId -> youthId[] from the raw link rows.
 */
export function buildParentChildMap(
  links: { parent_id: string; youth_id: string }[]
): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const link of links) {
    const existing = map.get(link.parent_id)
    if (existing) {
      existing.push(link.youth_id)
    } else {
      map.set(link.parent_id, [link.youth_id])
    }
  }
  return map
}

/**
 * Check if adding userId to a group with the given members would cause
 * a parent-child conflict.
 *
 * Returns { conflict: false } or { conflict: true, reason: "..." }
 */
export function checkConflict(
  groupMembers: string[],
  userId: string,
  parentChildMap: Map<string, string[]>
): { conflict: boolean; reason?: string } {
  // Check 1: Is userId a parent with a child already in groupMembers?
  const linkedYouth = parentChildMap.get(userId)
  if (linkedYouth) {
    for (const youthId of linkedYouth) {
      if (groupMembers.includes(youthId)) {
        return { conflict: true, reason: 'Forelder-barn-konflikt' }
      }
    }
  }

  // Check 2: Is userId a youth with a parent already in groupMembers?
  for (const [parentId, youthIds] of parentChildMap) {
    if (youthIds.includes(userId) && groupMembers.includes(parentId)) {
      return { conflict: true, reason: 'Forelder-barn-konflikt' }
    }
  }

  return { conflict: false }
}
