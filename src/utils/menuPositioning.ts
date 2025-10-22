const DEFAULT_VIEWPORT_PADDING = 8
const DEFAULT_SUBMENU_OFFSET = 8

export interface Size {
  width: number
  height: number
}

const clamp = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

export const calculateMenuPosition = (
  anchorX: number,
  anchorY: number,
  size: Size,
  padding: number = DEFAULT_VIEWPORT_PADDING,
) => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  const maxLeft = Math.max(padding, viewportWidth - size.width - padding)
  const maxTop = Math.max(padding, viewportHeight - size.height - padding)

  const left = clamp(anchorX, padding, maxLeft)
  const top = clamp(anchorY, padding, maxTop)

  return { left, top }
}

export const calculateSubmenuPosition = (
  triggerRect: DOMRect,
  size: Size,
  padding: number = DEFAULT_VIEWPORT_PADDING,
  offset: number = DEFAULT_SUBMENU_OFFSET,
) => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  const preferredLeft = triggerRect.right + offset
  const alternativeLeft = triggerRect.left - size.width - offset

  let left = preferredLeft
  if (left + size.width > viewportWidth - padding && alternativeLeft >= padding) {
    left = alternativeLeft
  }

  const maxLeft = Math.max(padding, viewportWidth - size.width - padding)
  left = clamp(left, padding, maxLeft)

  let top = triggerRect.top
  const maxTop = Math.max(padding, viewportHeight - size.height - padding)
  top = clamp(top, padding, maxTop)

  return { left, top }
}

export const viewportPadding = DEFAULT_VIEWPORT_PADDING
export const submenuOffset = DEFAULT_SUBMENU_OFFSET
