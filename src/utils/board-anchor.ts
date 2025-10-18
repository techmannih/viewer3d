import type { PcbBoard } from "circuit-json"

type PointLike = { x?: number | string | null; y?: number | string | null } | null | undefined

export type BoardAnchorAlignment =
  | "center"
  | "top_left"
  | "top_center"
  | "top_right"
  | "center_left"
  | "center_right"
  | "bottom_left"
  | "bottom_center"
  | "bottom_right"

const VALID_ALIGNMENTS: Record<string, BoardAnchorAlignment> = {
  center: "center",
  top_left: "top_left",
  top_center: "top_center",
  top_right: "top_right",
  center_left: "center_left",
  center_right: "center_right",
  bottom_left: "bottom_left",
  bottom_center: "bottom_center",
  bottom_right: "bottom_right",
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
  const x = toFiniteNumber(point.x ?? null)
  const y = toFiniteNumber(point.y ?? null)
  if (x === null || y === null) return null
  return { x, y }
}

const resolveAnchorPositionCandidates = (board?: PcbBoard | null): PointLike[] => {
  if (!board) return []
  const autoSize: any = (board as any).auto_size
  const candidates: PointLike[] = []
  if (autoSize?.anchor_position) candidates.push(autoSize.anchor_position)
  if (autoSize?.anchor?.position) candidates.push(autoSize.anchor.position)
  if ((board as any).anchor_position) candidates.push((board as any).anchor_position)
  if ((board as any).anchor?.position)
    candidates.push((board as any).anchor.position as PointLike)
  if (board.center) candidates.push(board.center as PointLike)
  return candidates
}

const normalizeAlignment = (value: unknown): BoardAnchorAlignment | null => {
  if (typeof value !== "string") return null
  const normalized = value.toLowerCase().replace(/-/g, "_")
  return VALID_ALIGNMENTS[normalized] ?? null
}

const resolveAnchorAlignmentCandidates = (board?: PcbBoard | null): unknown[] => {
  if (!board) return []
  const autoSize: any = (board as any).auto_size
  const candidates: unknown[] = []
  if (autoSize?.anchor_alignment) candidates.push(autoSize.anchor_alignment)
  if (autoSize?.anchor?.alignment) candidates.push(autoSize.anchor.alignment)
  if ((board as any).anchor_alignment)
    candidates.push((board as any).anchor_alignment)
  if ((board as any).anchor?.alignment)
    candidates.push((board as any).anchor.alignment)
  return candidates
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
  const width = toFiniteNumber((board as any).width)
  const height = toFiniteNumber((board as any).height)
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
