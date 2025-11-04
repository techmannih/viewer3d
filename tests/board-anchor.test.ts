import { describe, expect, test } from "bun:test"
import type { PcbBoard } from "circuit-json"
import { boardAnchorAlignment, boardAnchorPosition } from "../src/utils/board-anchor"

const createBoard = (partial: Partial<PcbBoard>): PcbBoard =>
  partial as PcbBoard

describe("boardAnchorPosition", () => {
  test("falls back to board center when no anchor is provided", () => {
    const board = createBoard({
      type: "pcb_board",
      center: { x: 3, y: -2 },
      width: 10,
      height: 5,
    })

    expect(boardAnchorPosition(board)).toEqual({ x: 3, y: -2 })
  })

  test("uses configured auto-size board anchor position when provided", () => {
    const board = createBoard({
      type: "pcb_board",
      center: { x: 0, y: 0 },
      width: 20,
      height: 10,
      auto_size_config: {
        board_anchor_position: { x: 5, y: 7 },
      },
    })

    expect(boardAnchorPosition(board)).toEqual({ x: 5, y: 7 })
  })
})

describe("boardAnchorAlignment", () => {
  test("returns explicit configuration if present", () => {
    const board = createBoard({
      type: "pcb_board",
      center: { x: 0, y: 0 },
      width: 10,
      height: 5,
      auto_size_config: {
        board_anchor_alignment: "top-right",
      },
    })

    expect(boardAnchorAlignment(board)).toBe("top-right")
  })

  test("infers alignment from geometry when anchor is offset", () => {
    const board = createBoard({
      type: "pcb_board",
      center: { x: 10, y: 5 },
      width: 20,
      height: 10,
      board_anchor_position: { x: 0, y: 0 },
    })

    expect(boardAnchorAlignment(board)).toBe("bottom-left")
  })

  test("infers top-right alignment when anchor is above and to the right", () => {
    const board = createBoard({
      type: "pcb_board",
      center: { x: 0, y: 0 },
      width: 20,
      height: 10,
      board_anchor_position: { x: 10, y: 5 },
    })

    expect(boardAnchorAlignment(board)).toBe("top-right")
  })
})
