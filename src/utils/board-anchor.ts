import type { PcbBoard } from "circuit-json"

export type BoardAnchorAlignment =
  | "center"
  | "top_left"
  | "top_right"
  | "bottom_left"
  | "bottom_right"
  | "top_center"
  | "bottom_center"
  | "center_left"
  | "center_right"

export interface BoardAnchorPosition {
  x: number
  y: number
}

export interface BoardBoundingBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

const BOARD_ANCHOR_ALIGNMENTS: ReadonlySet<BoardAnchorAlignment> = new Set([
  "center",
  "top_left",
  "top_right",
  "bottom_left",
  "bottom_right",
  "top_center",
  "bottom_center",
  "center_left",
  "center_right",
])

const BOARD_ALIGNMENT_ALIASES: Record<string, BoardAnchorAlignment> = {
  middle: "center",
  centre: "center",
  middle_center: "center",
  center_middle: "center",
  left: "center_left",
  centre_left: "center_left",
  centerleft: "center_left",
  left_center: "center_left",
  right: "center_right",
  centre_right: "center_right",
  centerright: "center_right",
  right_center: "center_right",
  top: "top_center",
  topcentre: "top_center",
  top_center: "top_center",
  topmiddle: "top_center",
  middle_top: "top_center",
  bottom: "bottom_center",
  bottomcentre: "bottom_center",
  bottom_center: "bottom_center",
  bottommiddle: "bottom_center",
  middle_bottom: "bottom_center",
  top_left: "top_left",
  topleft: "top_left",
  left_top: "top_left",
  top_right: "top_right",
  topright: "top_right",
  right_top: "top_right",
  bottom_left: "bottom_left",
  bottomleft: "bottom_left",
  left_bottom: "bottom_left",
  bottom_right: "bottom_right",
  bottomright: "bottom_right",
  right_bottom: "bottom_right",
}

const ALIGNMENT_CLEANUP_REGEX = /(?<!^)([A-Z])/g
const NUMBER_REGEX = /-?\d+(?:\.\d+)?/

type PointLike = { x?: unknown; y?: unknown } | null | undefined

type AutoSizeConfigLike =
  | {
      anchor_position?: PointLike
      anchorPosition?: PointLike
      anchor_alignment?: unknown
      anchorAlignment?: unknown
    }
  | null
  | undefined

function parseNumericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    const match = trimmed.match(NUMBER_REGEX)
    if (!match) return null
    const parsed = Number(match[0])
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function sanitizePoint(point: PointLike): BoardAnchorPosition | null {
  if (!point) return null
  const x = parseNumericValue((point as any).x)
  const y = parseNumericValue((point as any).y)
  if (x === null || y === null) return null
  return { x, y }
}

function extractAutoSizeConfig(board?: PcbBoard | null): AutoSizeConfigLike {
  if (!board) return null
  const candidates: AutoSizeConfigLike[] = [
    (board as any).auto_size_settings,
    (board as any).auto_resize_settings,
    (board as any).auto_size_config,
    (board as any).auto_resize_config,
    (board as any).auto_size,
    (board as any).auto_resize,
  ]

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      return candidate
    }
  }

  return null
}

function extractAnchorPositionFromConfig(board?: PcbBoard | null) {
  const config = extractAutoSizeConfig(board)
  return (
    sanitizePoint(config?.anchor_position) ??
    sanitizePoint(config?.anchorPosition) ??
    sanitizePoint((board as any)?.anchor_position) ??
    sanitizePoint((board as any)?.anchorPosition) ??
    sanitizePoint((board as any)?.board_anchor_position) ??
    null
  )
}

function normalizeAlignment(value: unknown): BoardAnchorAlignment {
  if (typeof value !== "string") {
    return "center"
  }

  const cleaned = value
    .replace(ALIGNMENT_CLEANUP_REGEX, "_$1")
    .replace(/[-\s]+/g, "_")
    .toLowerCase()

  const alias = BOARD_ALIGNMENT_ALIASES[cleaned]
  if (alias) return alias

  if (BOARD_ANCHOR_ALIGNMENTS.has(cleaned as BoardAnchorAlignment)) {
    return cleaned as BoardAnchorAlignment
  }

  return "center"
}

function centerFromAnchor(
  anchor: BoardAnchorPosition,
  width: number,
  height: number,
  alignment: BoardAnchorAlignment,
): BoardAnchorPosition {
  const halfWidth = width / 2
  const halfHeight = height / 2

  switch (alignment) {
    case "top_left":
      return { x: anchor.x + halfWidth, y: anchor.y - halfHeight }
    case "top_center":
      return { x: anchor.x, y: anchor.y - halfHeight }
    case "top_right":
      return { x: anchor.x - halfWidth, y: anchor.y - halfHeight }
    case "center_left":
      return { x: anchor.x + halfWidth, y: anchor.y }
    case "center_right":
      return { x: anchor.x - halfWidth, y: anchor.y }
    case "bottom_left":
      return { x: anchor.x + halfWidth, y: anchor.y + halfHeight }
    case "bottom_center":
      return { x: anchor.x, y: anchor.y + halfHeight }
    case "bottom_right":
      return { x: anchor.x - halfWidth, y: anchor.y + halfHeight }
    case "center":
    default:
      return { x: anchor.x, y: anchor.y }
  }
}

function boundingBoxFromOutline(board: PcbBoard): BoardBoundingBox | null {
  const outline = Array.isArray(board.outline) ? board.outline : null
  if (!outline || outline.length === 0) {
    return null
  }

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const pt of outline) {
    const point = sanitizePoint(pt)
    if (!point) continue
    if (point.x < minX) minX = point.x
    if (point.x > maxX) maxX = point.x
    if (point.y < minY) minY = point.y
    if (point.y > maxY) maxY = point.y
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return null
  }

  return { minX, maxX, minY, maxY }
}

function boundingBoxFromRect(board: PcbBoard): BoardBoundingBox | null {
  const rawWidth = parseNumericValue((board as any).width)
  const rawHeight = parseNumericValue((board as any).height)

  if (rawWidth === null || rawHeight === null) {
    return null
  }

  const width = rawWidth
  const height = rawHeight

  let center = sanitizePoint((board as any).center)
  if (!center) {
    const anchor = extractAnchorPositionFromConfig(board)
    if (anchor) {
      const alignment = boardAnchorAlignment(board)
      center = centerFromAnchor(anchor, width, height, alignment)
    }
  }

  if (!center) {
    center = { x: 0, y: 0 }
  }

  const halfWidth = width / 2
  const halfHeight = height / 2

  return {
    minX: center.x - halfWidth,
    maxX: center.x + halfWidth,
    minY: center.y - halfHeight,
    maxY: center.y + halfHeight,
  }
}

export function boardBoundingBox(board?: PcbBoard | null): BoardBoundingBox | null {
  if (!board) return null
  const outlineBox = boundingBoxFromOutline(board)
  if (outlineBox) return outlineBox
  return boundingBoxFromRect(board)
}

export function boardAnchorAlignment(board?: PcbBoard | null): BoardAnchorAlignment {
  if (!board) return "center"

  const config = extractAutoSizeConfig(board)
  const rawAlignment =
    config?.anchor_alignment ??
    config?.anchorAlignment ??
    (board as any)?.anchor_alignment ??
    (board as any)?.anchorAlignment ??
    (board as any)?.board_anchor_alignment

  return normalizeAlignment(rawAlignment)
}

export function boardAnchorPosition(board?: PcbBoard | null): BoardAnchorPosition {
  const directAnchor = extractAnchorPositionFromConfig(board)
  if (directAnchor) return directAnchor

  const alignment = boardAnchorAlignment(board)
  const box = boardBoundingBox(board)
  if (!box) {
    const center = sanitizePoint((board as any)?.center)
    if (center) return center
    return { x: 0, y: 0 }
  }

  const midX = (box.minX + box.maxX) / 2
  const midY = (box.minY + box.maxY) / 2

  switch (alignment) {
    case "top_left":
      return { x: box.minX, y: box.maxY }
    case "top_center":
      return { x: midX, y: box.maxY }
    case "top_right":
      return { x: box.maxX, y: box.maxY }
    case "center_left":
      return { x: box.minX, y: midY }
    case "center_right":
      return { x: box.maxX, y: midY }
    case "bottom_left":
      return { x: box.minX, y: box.minY }
    case "bottom_center":
      return { x: midX, y: box.minY }
    case "bottom_right":
      return { x: box.maxX, y: box.minY }
    case "center":
    default:
      return { x: midX, y: midY }
  }
}

export function boardCenterPoint(board?: PcbBoard | null): BoardAnchorPosition | null {
  if (!board) return null
  const direct = sanitizePoint((board as any).center)
  if (direct) return direct

  const box = boardBoundingBox(board)
  if (box) {
    return {
      x: (box.minX + box.maxX) / 2,
      y: (box.minY + box.maxY) / 2,
    }
  }

  const anchor = extractAnchorPositionFromConfig(board)
  return anchor ?? null
}
