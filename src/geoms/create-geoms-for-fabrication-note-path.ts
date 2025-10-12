import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import type { Vec2 } from "@jscad/modeling/src/maths/types"
import { line } from "@jscad/modeling/src/primitives"
import { expand } from "@jscad/modeling/src/operations/expansions"
import { extrudeLinear } from "@jscad/modeling/src/operations/extrusions"
import { translate } from "@jscad/modeling/src/operations/transforms"
import { colorize } from "@jscad/modeling/src/colors"
import type { PcbFabricationNotePath } from "circuit-json"
import type { GeomContext } from "../GeomContext"
import { M } from "./constants"

export const FABRICATION_NOTE_COLOR: [number, number, number] = [1, 0.8, 0.2]

export function createFabricationNotePathGeom(
  path: PcbFabricationNotePath,
  ctx: GeomContext,
): Geom3 | undefined {
  if (path.route.length < 2) return undefined

  const routePoints: Vec2[] = path.route.map((p) => {
    const x =
      typeof p.x === "string" ? Number.parseFloat(p.x) || 0 : (p.x as number)
    const y =
      typeof p.y === "string" ? Number.parseFloat(p.y) || 0 : (p.y as number)
    return [x, y]
  })
  const pathLine = line(routePoints)

  const rawStrokeWidth = path.stroke_width ?? 0.1
  const strokeWidth =
    typeof rawStrokeWidth === "string"
      ? Number.parseFloat(rawStrokeWidth) || 0.1
      : rawStrokeWidth
  const expandedPath = expand(
    { delta: strokeWidth / 2, corners: "round" },
    pathLine,
  )

  const layerSign = path.layer === "bottom" ? -1 : 1
  const zPos = (layerSign * ctx.pcbThickness) / 2 + layerSign * M * 2.5

  let pathGeom = translate(
    [0, 0, zPos],
    extrudeLinear({ height: 0.012 }, expandedPath),
  )

  pathGeom = colorize(FABRICATION_NOTE_COLOR, pathGeom)
  return pathGeom
}
