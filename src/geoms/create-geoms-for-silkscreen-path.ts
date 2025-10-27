import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import type { Vec2 } from "@jscad/modeling/src/maths/types"
import { line } from "@jscad/modeling/src/primitives"
import { expand } from "@jscad/modeling/src/operations/expansions"
import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { translate } from "@jscad/modeling/src/operations/transforms"
import { colorize } from "@jscad/modeling/src/colors"
import type { GeomContext } from "../GeomContext"
import { M } from "./constants"
import type { RGB } from "@jscad/modeling/src/colors"

export interface PcbPathElementForGeoms {
  route: Array<{ x: number; y: number }>
  stroke_width?: number | null
  layer: "top" | "bottom"
}

export function createSilkscreenPathGeom(
  sp: PcbPathElementForGeoms,
  ctx: GeomContext,
  options: {
    color?: RGB
    height?: number
    zOffsetMultiplier?: number
  } = {},
): Geom3 | undefined {
  if (sp.route.length < 2) return undefined

  const routePoints: Vec2[] = sp.route.map((p) => [p.x, p.y])
  const pathLine = line(routePoints)

  const strokeWidthRaw = sp.stroke_width ?? 0.1
  const strokeWidth =
    typeof strokeWidthRaw === "number"
      ? strokeWidthRaw
      : parseFloat(String(strokeWidthRaw)) || 0.1
  const expandedPath = expand(
    { delta: strokeWidth / 2, corners: "round" },
    pathLine,
  )

  const layerSign = sp.layer === "bottom" ? -1 : 1
  const zOffsetMultiplier = options.zOffsetMultiplier ?? 1.5
  const zPos =
    (layerSign * ctx.pcbThickness) / 2 + layerSign * M * zOffsetMultiplier // Slightly offset from board surface

  let pathGeom = translate(
    [0, 0, zPos],
    extrudeLinear({ height: options.height ?? 0.012 }, expandedPath), // Standard silkscreen thickness
  )

  pathGeom = colorize(options.color ?? [1, 1, 1], pathGeom)
  return pathGeom
}
