import type { PcbBoard } from "circuit-json"

export type BoardAnchorAlignment =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"

const DEFAULT_ANCHOR = { x: 0, y: 0 }
const DEFAULT_ALIGNMENT: BoardAnchorAlignment = "center"

const alignmentMap: Record<string, BoardAnchorAlignment> = {
  center: "center",
  middle: "center",
  "center-center": "center",
  "center-middle": "center",
  "middle-center": "center",
  "top": "top",
  "top-center": "top",
  "center-top": "top",
  "top-middle": "top",
  "middle-top": "top",
  "bottom": "bottom",
  "bottom-center": "bottom",
  "center-bottom": "bottom",
  "bottom-middle": "bottom",
  "middle-bottom": "bottom",
  "left": "left",
  "left-center": "left",
  "center-left": "left",
  "left-middle": "left",
  "middle-left": "left",
  "right": "right",
  "right-center": "right",
  "center-right": "right",
  "right-middle": "right",
  "middle-right": "right",
  "top-left": "top-left",
  "left-top": "top-left",
  "top-left-center": "top-left",
  "center-top-left": "top-left",
  "top-center-left": "top-left",
  "bottom-left": "bottom-left",
  "left-bottom": "bottom-left",
  "bottom-left-center": "bottom-left",
  "center-bottom-left": "bottom-left",
  "bottom-center-left": "bottom-left",
  "top-right": "top-right",
  "right-top": "top-right",
  "top-right-center": "top-right",
  "center-top-right": "top-right",
  "top-center-right": "top-right",
  "bottom-right": "bottom-right",
  "right-bottom": "bottom-right",
  "bottom-right-center": "bottom-right",
  "center-bottom-right": "bottom-right",
  "bottom-center-right": "bottom-right",
}

const VALID_ALIGNMENTS = new Set(Object.values(alignmentMap))

type MaybeNumber = number | null | undefined

type MaybePoint = { x?: MaybeNumber; y?: MaybeNumber } | null | undefined

type BoardWithAnchor = PcbBoard & {
  anchor_position?: MaybePoint
  anchor_alignment?: string | null
  board_anchor_position?: MaybePoint
  board_anchor_alignment?: string | null
  auto_size_config?: {
    anchor_position?: MaybePoint
    anchor_alignment?: string | null
    board_anchor_position?: MaybePoint
    board_anchor_alignment?: string | null
    board_anchor?: {
      position?: MaybePoint
      alignment?: string | null
    } | null
  }
}

const isFiniteNumber = (value: MaybeNumber): value is number =>
  typeof value === "number" && Number.isFinite(value)

const pickPoint = (candidate: MaybePoint): { x: number; y: number } | null => {
  if (!candidate) return null
  const { x, y } = candidate
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null
  return { x, y }
}

const extractAlignment = (
  alignment: string | null | undefined,
): BoardAnchorAlignment | null => {
  if (!alignment) return null
  const normalized = alignment
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")

  if (alignmentMap[normalized]) {
    return alignmentMap[normalized]
  }

  // Attempt to drop any trailing "-center" or "-middle" modifiers
  const simplified = normalized
    .replace(/-(center|middle)$/u, "")
    .replace(/^(center|middle)-/u, "")

  if (alignmentMap[simplified]) {
    return alignmentMap[simplified]
  }

  return null
}

const approxEqual = (a: number, b: number, tolerance = 1e-6) =>
  Math.abs(a - b) <= tolerance

const deriveAlignmentFromBoard = (
  board: BoardWithAnchor | null | undefined,
  anchor: { x: number; y: number },
): BoardAnchorAlignment | null => {
  if (!board?.center) return null
  const { center } = board
  const { width, height } = board

  if (!isFiniteNumber(width) || !isFiniteNumber(height)) {
    return null
  }

  const halfWidth = width / 2
  const halfHeight = height / 2

  if (!isFiniteNumber(halfWidth) || !isFiniteNumber(halfHeight)) {
    return null
  }

  const dx = center.x - anchor.x
  const dy = center.y - anchor.y

  const horizontal = approxEqual(dx, 0)
    ? "center"
    : approxEqual(dx, halfWidth)
      ? "left"
      : approxEqual(dx, -halfWidth)
        ? "right"
        : null

  const vertical = approxEqual(dy, 0)
    ? "center"
    : approxEqual(dy, halfHeight)
      ? "bottom"
      : approxEqual(dy, -halfHeight)
        ? "top"
        : null

  if (!horizontal || !vertical) {
    return null
  }

  if (horizontal === "center" && vertical === "center") {
    return "center"
  }

  if (horizontal === "center") {
    return vertical as BoardAnchorAlignment
  }

  if (vertical === "center") {
    return horizontal as BoardAnchorAlignment
  }

  const combined = `${vertical}-${horizontal}` as BoardAnchorAlignment
  if (VALID_ALIGNMENTS.has(combined)) {
    return combined
  }

  return null
}

const anchorCandidates = (
  board: BoardWithAnchor | null | undefined,
): MaybePoint[] => {
  if (!board) return []

  const cfg = board.auto_size_config
  const boardAnchor = cfg?.board_anchor

  return [
    boardAnchor?.position,
    cfg?.board_anchor_position,
    cfg?.anchor_position,
    board.board_anchor_position,
    board.anchor_position,
    board.center,
  ]
}

const alignmentCandidates = (
  board: BoardWithAnchor | null | undefined,
): Array<string | null | undefined> => {
  if (!board) return []
  const cfg = board.auto_size_config
  const boardAnchor = cfg?.board_anchor

  return [
    boardAnchor?.alignment,
    cfg?.board_anchor_alignment,
    cfg?.anchor_alignment,
    board.board_anchor_alignment,
    board.anchor_alignment,
  ]
}

export const boardAnchorPosition = (
  board: BoardWithAnchor | null | undefined,
): { x: number; y: number } => {
  for (const candidate of anchorCandidates(board)) {
    const point = pickPoint(candidate)
    if (point) {
      return point
    }
  }

  return { ...DEFAULT_ANCHOR }
}

export const boardAnchorAlignment = (
  board: BoardWithAnchor | null | undefined,
): BoardAnchorAlignment => {
  for (const candidate of alignmentCandidates(board)) {
    const extracted = extractAlignment(candidate ?? undefined)
    if (extracted) {
      return extracted
    }
  }

  const anchor = boardAnchorPosition(board)
  const derived = deriveAlignmentFromBoard(board, anchor)
  if (derived) {
    return derived
  }

  return DEFAULT_ALIGNMENT
}
