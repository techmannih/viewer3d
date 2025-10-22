import { describe, expect, it } from "bun:test"
import { getPadRotationDegrees, getPadRotationRadians } from "../src/utils/get-pad-rotation"

describe("getPadRotation utilities", () => {
  it("returns positive rotation for top layer pads", () => {
    const rotationDeg = getPadRotationDegrees({
      ccw_rotation: 45,
      layer: "top",
    } as any)
    expect(rotationDeg).toBe(45)
  })

  it("returns negative rotation for bottom layer pads", () => {
    const rotationDeg = getPadRotationDegrees({
      ccw_rotation: 45,
      layer: "bottom",
    } as any)
    expect(rotationDeg).toBe(-45)
  })

  it("converts rotation to radians with correct sign", () => {
    const rotationRad = getPadRotationRadians({
      ccw_rotation: 90,
      layer: "bottom",
    } as any)
    expect(rotationRad).toBeCloseTo((-90 * Math.PI) / 180)
  })
})
