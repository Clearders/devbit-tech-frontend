/** Fixed panel placement, including narrow and short viewports. */
export function placeInfoPanel(anchor: { left: number; right: number; top: number; bottom: number },
  viewport: { width: number; height: number }, panelHeight: number, preferredWidth = 360) {
  const margin = 12
  const width = Math.max(0, Math.min(preferredWidth, viewport.width - margin * 2))
  const below = Math.max(0, viewport.height - anchor.bottom - 8 - margin)
  const above = Math.max(0, anchor.top - 8 - margin)
  const fitsBelow = panelHeight <= below
  const useBelow = fitsBelow || below >= above
  const maxHeight = Math.max(0, Math.min(viewport.height - margin * 2, useBelow ? below : above))
  // If an anchor fills the viewport, use the available viewport instead.
  const available = maxHeight >= 120 ? maxHeight : Math.max(0, viewport.height - margin * 2)
  const height = Math.min(panelHeight, available)
  const top = maxHeight < 120 ? margin : useBelow ? anchor.bottom + 8 : anchor.top - 8 - height
  return { width, left: Math.max(margin, Math.min(anchor.right - width, viewport.width - width - margin)),
    top: Math.max(margin, Math.min(top, viewport.height - height - margin)), maxHeight: available }
}

export function infoPanelContains(target: Node | null, trigger?: HTMLElement, panel?: HTMLElement) {
  return !!target && (!!trigger?.contains(target) || !!panel?.contains(target))
}
