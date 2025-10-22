import type { PcbSmtPad } from "circuit-json"

const TOP_LAYER = "top"
const BOTTOM_LAYER = "bottom"

const getRotationSignForLayer = (layer?: "top" | "bottom" | null) =>
  layer === BOTTOM_LAYER ? -1 : 1

export const getPadRotationDegrees = (pad: PcbSmtPad) => {
  const rotation = pad.ccw_rotation ?? 0
  const sign = getRotationSignForLayer(pad.layer ?? TOP_LAYER)
  return rotation * sign
}

export const getPadRotationRadians = (pad: PcbSmtPad) =>
  (getPadRotationDegrees(pad) * Math.PI) / 180
