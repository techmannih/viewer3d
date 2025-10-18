import type { PcbBoard } from "circuit-json"

type PointLike =
  | { x?: number | string | null; y?: number | string | null }
  | [number | string | null | undefined, number | string | null | undefined]
  | null
  | undefined

export type BoardAnchorAlignment =
  | "center"
  | "top_left"
  | "top_right"
  | "bottom_left"
  | "bottom_right"
  | "top"
  | "bottom"
  | "left"
  | "right"

const VALID_ALIGNMENTS: Record<string, BoardAnchorAlignment> = {
  center: "center",
  top_left: "top_left",
  top_right: "top_right",
  bottom_left: "bottom_left",
  bottom_right: "bottom_right",
  top: "top",
  bottom: "bottom",
  left: "left",
  right: "right",
}

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value)
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed
    }
  }
  return null
}

const toPoint = (point: PointLike): { x: number; y: number } | null => {
  if (!point) return null

  if (Array.isArray(point)) {
    const [rawX, rawY] = point
    const x = toFiniteNumber(rawX ?? null)
    const y = toFiniteNumber(rawY ?? null)
    if (x === null || y === null) return null
    return { x, y }
  }

  const x = toFiniteNumber(point.x ?? null)
  const y = toFiniteNumber(point.y ?? null)
  if (x === null || y === null) return null
  return { x, y }
}

const resolveAnchorPositionCandidates = (board?: PcbBoard | null): PointLike[] => {
  if (!board) return []
  const anyBoard = board as any
  const autoSize: any = anyBoard?.auto_size
  const candidates: PointLike[] = []
  if (autoSize?.anchor_position) candidates.push(autoSize.anchor_position)
  if (autoSize?.anchor?.position) candidates.push(autoSize.anchor.position)
  if (anyBoard?.anchor_position) candidates.push(anyBoard.anchor_position)
  if (anyBoard?.anchor?.position)
    candidates.push(anyBoard.anchor.position as PointLike)
  if (anyBoard?.board_anchor_position)
    candidates.push(anyBoard.board_anchor_position as PointLike)
  if (anyBoard?.board_anchor?.position)
    candidates.push(anyBoard.board_anchor.position as PointLike)
  if (anyBoard?.boardAnchorPosition)
    candidates.push(anyBoard.boardAnchorPosition as PointLike)
  if (anyBoard?.boardAnchor?.position)
    candidates.push(anyBoard.boardAnchor.position as PointLike)
  if (board.center) candidates.push(board.center as PointLike)
  return candidates
}

const normalizeAlignment = (value: unknown): BoardAnchorAlignment | null => {
  if (typeof value !== "string") return null
  const withUnderscores = value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[-\s]+/g, "_")
  const normalized = withUnderscores.replace(/_+/g, "_")
  return VALID_ALIGNMENTS[normalized] ?? null
}

const resolveAnchorAlignmentCandidates = (board?: PcbBoard | null): unknown[] => {
  if (!board) return []
  const anyBoard = board as any
  const autoSize: any = anyBoard?.auto_size
  const candidates: unknown[] = []
  if (autoSize?.anchor_alignment) candidates.push(autoSize.anchor_alignment)
  if (autoSize?.anchor?.alignment) candidates.push(autoSize.anchor.alignment)
  if (anyBoard?.anchor_alignment) candidates.push(anyBoard.anchor_alignment)
  if (anyBoard?.anchor?.alignment) candidates.push(anyBoard.anchor.alignment)
  if (anyBoard?.board_anchor_alignment)
    candidates.push(anyBoard.board_anchor_alignment)
  if (anyBoard?.board_anchor?.alignment)
    candidates.push(anyBoard.board_anchor.alignment)
  if (anyBoard?.boardAnchorAlignment)
    candidates.push(anyBoard.boardAnchorAlignment)
  if (anyBoard?.boardAnchor?.alignment)
    candidates.push(anyBoard.boardAnchor.alignment)
  return candidates
}

const dimensionKeys: Record<"width" | "height", string[]> = {
  width: ["width", "w", "x"],
  height: ["height", "h", "y"],
}

const axisKeyMap: Record<"width" | "height", "x" | "y"> = {
  width: "x",
  height: "y",
}

const dimensionFromSizeLike = (
  value: unknown,
  dimension: "width" | "height",
): number | null => {
  if (value == null) return null
  if (typeof value === "number") return toFiniteNumber(value)
  if (typeof value === "string") return toFiniteNumber(value)
  if (Array.isArray(value)) {
    const index = axisKeyMap[dimension] === "x" ? 0 : 1
    return toFiniteNumber(value[index] ?? null)
  }
  if (typeof value === "object") {
    for (const key of dimensionKeys[dimension]) {
      const candidate = toFiniteNumber((value as any)[key])
      if (candidate !== null) return candidate
    }
    const axis = axisKeyMap[dimension]
    const axisValue = (value as any)[axis]
    if (axisValue != null) {
      const candidate = dimensionFromSizeLike(axisValue, dimension)
      if (candidate !== null) return candidate
    }
    const index = axis === "x" ? 0 : 1
    const indexCandidate = toFiniteNumber((value as any)[index])
    if (indexCandidate !== null) return indexCandidate
  }
  return null
}

const axisCoordinateFromPoint = (
  point: unknown,
  axis: "x" | "y",
): number | null => {
  if (point == null) return null
  if (typeof point === "number" || typeof point === "string")
    return toFiniteNumber(point)
  if (Array.isArray(point)) {
    const index = axis === "x" ? 0 : 1
    return toFiniteNumber(point[index] ?? null)
  }
  if (typeof point === "object") {
    const candidate = toFiniteNumber((point as any)[axis])
    if (candidate !== null) return candidate
    const upperCandidate = toFiniteNumber((point as any)[axis.toUpperCase()])
    if (upperCandidate !== null) return upperCandidate
    const index = axis === "x" ? 0 : 1
    const indexCandidate = toFiniteNumber((point as any)[index])
    if (indexCandidate !== null) return indexCandidate
  }
  return null
}

const dimensionFromBoundingBox = (
  boundingBox: unknown,
  dimension: "width" | "height",
): number | null => {
  if (boundingBox == null) return null
  const axis = axisKeyMap[dimension]

  const tryCompute = (minValue: unknown, maxValue: unknown): number | null => {
    const min = axisCoordinateFromPoint(minValue, axis)
    const max = axisCoordinateFromPoint(maxValue, axis)
    if (min === null || max === null) return null
    return Math.max(max - min, 0)
  }

  if (Array.isArray(boundingBox)) {
    if (boundingBox.length >= 2) {
      const value = tryCompute(boundingBox[0], boundingBox[1])
      if (value !== null) return value
    }
    if (boundingBox.length >= 4) {
      const index = axis === "x" ? 0 : 1
      const offset = axis === "x" ? 2 : 3
      const min = toFiniteNumber(boundingBox[index] ?? null)
      const max = toFiniteNumber(boundingBox[offset] ?? null)
      if (min !== null && max !== null) return Math.max(max - min, 0)
    }
  }

  if (typeof boundingBox === "object") {
    const box = boundingBox as any

    const explicitSize = dimensionFromSizeLike(box, dimension)
    if (explicitSize !== null) return explicitSize

    const axisBox = box[axis]
    if (axisBox != null) {
      const direct = dimensionFromSizeLike(axisBox, dimension)
      if (direct !== null) return direct
      const candidate = tryCompute(axisBox.min ?? axisBox.lower, axisBox.max ?? axisBox.upper)
      if (candidate !== null) return candidate
    }

    const minKeys = [
      "min",
      "min_point",
      "minPoint",
      "lower",
      "lowerBound",
      "low",
      axis === "x" ? "min_x" : "min_y",
      axis === "x" ? "minX" : "minY",
    ]
    const maxKeys = [
      "max",
      "max_point",
      "maxPoint",
      "upper",
      "upperBound",
      "high",
      axis === "x" ? "max_x" : "max_y",
      axis === "x" ? "maxX" : "maxY",
    ]

    for (const minKey of minKeys) {
      const minCandidate = box[minKey]
      if (minCandidate == null) continue
      for (const maxKey of maxKeys) {
        const maxCandidate = box[maxKey]
        if (maxCandidate == null) continue
        const value = tryCompute(minCandidate, maxCandidate)
        if (value !== null) return value
      }
    }
  }

  return null
}

const resolveDimension = (
  board: PcbBoard,
  dimension: "width" | "height",
): number | null => {
  const anyBoard = board as any
  for (const key of dimensionKeys[dimension]) {
    const candidate = toFiniteNumber(anyBoard?.[key])
    if (candidate !== null) return candidate
  }

  const sizeLikeCandidates = [
    anyBoard?.size,
    anyBoard?.dimensions,
    anyBoard?.dimension,
  ]
  for (const candidate of sizeLikeCandidates) {
    const value = dimensionFromSizeLike(candidate, dimension)
    if (value !== null) return value
  }

  const autoSize = anyBoard?.auto_size ?? anyBoard?.autoSize
  if (!autoSize) return null

  for (const key of dimensionKeys[dimension]) {
    const candidate = toFiniteNumber(autoSize?.[key])
    if (candidate !== null) return candidate
  }

  const axis = axisKeyMap[dimension]
  const axisCandidate = toFiniteNumber(autoSize?.[axis])
  if (axisCandidate !== null) return axisCandidate

  const autoSizeSizeLike = [
    autoSize?.size,
    autoSize?.dimensions,
    autoSize?.dimension,
    autoSize?.board_size,
    autoSize?.boardSize,
  ]
  for (const candidate of autoSizeSizeLike) {
    const value = dimensionFromSizeLike(candidate, dimension)
    if (value !== null) return value
  }

  const boundingBoxCandidates = [
    autoSize?.bounding_box,
    autoSize?.boundingBox,
    autoSize?.bounds,
    autoSize?.extent,
    autoSize?.extents,
    autoSize?.range,
    autoSize?.ranges,
  ]
  for (const candidate of boundingBoxCandidates) {
    const value = dimensionFromBoundingBox(candidate, dimension)
    if (value !== null) return value
  }

  return null
}

export const boardAnchorPosition = (
  board?: PcbBoard | null,
): { x: number; y: number } => {
  for (const candidate of resolveAnchorPositionCandidates(board)) {
    const point = toPoint(candidate)
    if (point) return point
  }
  return { x: 0, y: 0 }
}

export const boardAnchorAlignment = (
  board?: PcbBoard | null,
): BoardAnchorAlignment => {
  for (const candidate of resolveAnchorAlignmentCandidates(board)) {
    const normalized = normalizeAlignment(candidate)
    if (normalized) return normalized
  }
  return "center"
}

export const boardDimensionsFromBoard = (
  board?: PcbBoard | null,
): { width: number; height: number } => {
  if (!board) return { width: 0, height: 0 }
  const width = resolveDimension(board, "width")
  const height = resolveDimension(board, "height")
  return {
    width: width ?? 0,
    height: height ?? 0,
  }
}

export const boardCenterFromAnchor = (
  board: PcbBoard,
): { x: number; y: number } => {
  const { width, height } = boardDimensionsFromBoard(board)
  const anchor = boardAnchorPosition(board)
  const alignment = boardAnchorAlignment(board)
  const parts = alignment.split("_")

  let centerX = anchor.x
  let centerY = anchor.y

  if (parts.includes("left")) {
    centerX = anchor.x + width / 2
  } else if (parts.includes("right")) {
    centerX = anchor.x - width / 2
  }

  if (parts.includes("top")) {
    centerY = anchor.y - height / 2
  } else if (parts.includes("bottom")) {
    centerY = anchor.y + height / 2
  }

  return { x: centerX, y: centerY }
}
