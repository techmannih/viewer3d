import type { PCBPlatedHole } from "circuit-json"

export type PcbHoleWithPolygonPad = PCBPlatedHole & {
  shape: "hole_with_polygon_pad"
  pad_outline: Array<{ x: number; y: number }>
  hole_shape: "circle" | "oval" | "pill" | "rotated_pill"
  hole_diameter?: number
  hole_width?: number
  hole_height?: number
  hole_offset_x?: number
  hole_offset_y?: number
  ccw_rotation?: number
}
