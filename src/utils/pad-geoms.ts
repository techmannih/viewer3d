import type { PcbSmtPad } from "circuit-json"
import type { ManifoldToplevel } from "manifold-3d/manifold.d.ts"
import {
  clampRectBorderRadius,
  extractRectBorderRadius,
} from "./rect-border-radius"

const RECT_PAD_SEGMENTS = 64

export function createRoundedRectPrism({
  Manifold,
  width,
  height,
  thickness,
  borderRadius,
}: {
  Manifold: any
  width: number
  height: number
  thickness: number
  borderRadius?: number | null
}) {
  const clampedRadius = clampRectBorderRadius(width, height, borderRadius)

  if (clampedRadius <= 0) {
    return Manifold.cube([width, height, thickness], true)
  }

  const shapes: any[] = []
  const innerWidth = width - 2 * clampedRadius
  const innerHeight = height - 2 * clampedRadius

  if (innerWidth > 0) {
    shapes.push(Manifold.cube([innerWidth, height, thickness], true))
  }

  if (innerHeight > 0) {
    shapes.push(Manifold.cube([width, innerHeight, thickness], true))
  }

  const cornerOffsets = [
    [width / 2 - clampedRadius, height / 2 - clampedRadius],
    [-width / 2 + clampedRadius, height / 2 - clampedRadius],
    [-width / 2 + clampedRadius, -height / 2 + clampedRadius],
    [width / 2 - clampedRadius, -height / 2 + clampedRadius],
  ]

  cornerOffsets.forEach(([x, y]) => {
    shapes.push(
      Manifold.cylinder(
        thickness,
        clampedRadius,
        clampedRadius,
        RECT_PAD_SEGMENTS,
        true,
      ).translate([x, y, 0]),
    )
  })

  return Manifold.union(shapes)
}

const arePointsClockwise = (points: Array<[number, number]>): boolean => {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    const current = points[i]
    const next = points[j]
    if (!current || !next) continue
    area += current[0] * next[1]
    area -= next[0] * current[1]
  }
  const signedArea = area / 2
  return signedArea <= 0
}

export interface PadManifoldOpResult {
  padOp: any
  cleanup: any[]
}

export function createPadManifoldOp({
  Manifold,
  CrossSection,
  pad,
  padBaseThickness,
}: {
  Manifold: any
  CrossSection: ManifoldToplevel["CrossSection"]
  pad: PcbSmtPad
  padBaseThickness: number
}): PadManifoldOpResult | null {
  if (pad.shape === "rect") {
    const rectBorderRadius = extractRectBorderRadius(pad)
    const padOp = createRoundedRectPrism({
      Manifold,
      width: pad.width,
      height: pad.height,
      thickness: padBaseThickness,
      borderRadius: rectBorderRadius,
    })
    return { padOp, cleanup: [] }
  } else if (pad.shape === "rotated_rect") {
    const rectBorderRadius = extractRectBorderRadius(pad)
    let padOp = createRoundedRectPrism({
      Manifold,
      width: pad.width,
      height: pad.height,
      thickness: padBaseThickness,
      borderRadius: rectBorderRadius,
    })

    const rotation = pad.ccw_rotation ?? 0
    if (rotation) {
      padOp = padOp.rotate([0, 0, rotation])
    }

    return { padOp, cleanup: [] }
  } else if (pad.shape === "circle" && pad.radius) {
    const padOp = Manifold.cylinder(
      padBaseThickness,
      pad.radius,
      -1,
      32,
      true,
    )
    return { padOp, cleanup: [] }
  } else if (pad.shape === "polygon") {
    const polygonPad = pad as PcbSmtPad & {
      points?: Array<{ x: number; y: number }>
    }
    if (!polygonPad.points || polygonPad.points.length < 3) {
      return null
    }

    let pointsVec2 = polygonPad.points.map(
      (point) => [point.x, point.y] as [number, number],
    )

    if (arePointsClockwise(pointsVec2)) {
      pointsVec2 = pointsVec2.reverse()
    }

    const crossSection = CrossSection.ofPolygons([pointsVec2])
    const padOp = Manifold.extrude(
      crossSection,
      padBaseThickness,
      0,
      0,
      [1, 1],
      true,
    )

    return { padOp, cleanup: [crossSection] }
  }
  return null
}
