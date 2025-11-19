import type { ManifoldToplevel } from "manifold-3d"
import type { AnyCircuitElement, PcbPlatedHole } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import * as THREE from "three"
import { createCircleHoleDrill, createPlatedHoleDrill } from "../hole-geoms"
import { createRoundedRectPrism } from "../pad-geoms"
import { manifoldMeshToThreeGeometry } from "../manifold-mesh-to-three-geometry"
import {
  colors as defaultColors,
  MANIFOLD_Z_OFFSET,
  SMOOTH_CIRCLE_SEGMENTS,
  DEFAULT_SMT_PAD_THICKNESS,
  M,
  BOARD_SURFACE_OFFSET,
} from "../../geoms/constants"
import { extractRectBorderRadius } from "../rect-border-radius"
import type { PcbHoleWithPolygonPad } from "../../types/pcb-hole-with-polygon-pad"

const arePointsClockwise = (points: Array<[number, number]>): boolean => {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i]![0] * points[j]![1]
    area -= points[j]![0] * points[i]![1]
  }
  return area / 2 <= 0
}

const COPPER_COLOR = new THREE.Color(...defaultColors.copper)
const PLATED_HOLE_LIP_HEIGHT = 0.05

export interface ProcessPlatedHolesResult {
  platedHoleBoardDrills: any[]
  platedHoleCopperGeoms: Array<{
    key: string
    geometry: THREE.BufferGeometry
    color: THREE.Color
  }>
  /** Union of all plated-hole copper Manifold ops (for subtraction upstream) */
  platedHoleSubtractOp?: any
}

export function processPlatedHolesForManifold(
  Manifold: ManifoldToplevel["Manifold"],
  CrossSection: ManifoldToplevel["CrossSection"],
  circuitJson: AnyCircuitElement[],
  pcbThickness: number,
  manifoldInstancesForCleanup: any[],
  boardClipVolume?: any,
): ProcessPlatedHolesResult {
  const platedHoleBoardDrills: any[] = []
  const pcbPlatedHoles = su(circuitJson).pcb_plated_hole.list()
  const platedHoleCopperGeoms: Array<{
    key: string
    geometry: THREE.BufferGeometry
    color: THREE.Color
  }> = []

  // NEW: collect copper Manifold ops to union at the end
  const platedHoleCopperOpsForSubtract: any[] = []

  const createPillOp = (width: number, height: number, depth: number) => {
    const pillOp = createRoundedRectPrism({
      Manifold,
      width,
      height,
      thickness: depth,
      borderRadius: Math.min(width, height) / 2,
    })
    manifoldInstancesForCleanup.push(pillOp)
    return pillOp
  }

  pcbPlatedHoles.forEach((ph: PcbPlatedHole, index: number) => {
    if (ph.shape === "circle") {
      // Board cut for plated holes
      const translatedDrill = createPlatedHoleDrill({
        Manifold,
        x: ph.x,
        y: ph.y,
        outerDiameter: ph.hole_diameter * 1.02,
        thickness: pcbThickness,
        zOffset: MANIFOLD_Z_OFFSET,
        segments: SMOOTH_CIRCLE_SEGMENTS,
      })
      manifoldInstancesForCleanup.push(translatedDrill)
      platedHoleBoardDrills.push(translatedDrill)

      // Copper part of plated holes
      const copperPartThickness = pcbThickness + 2 * MANIFOLD_Z_OFFSET
      const platedPart = Manifold.cylinder(
        copperPartThickness,
        ph.outer_diameter / 2,
        ph.outer_diameter / 2,
        SMOOTH_CIRCLE_SEGMENTS,
        true,
      )
      manifoldInstancesForCleanup.push(platedPart)
      const drillForCopper = Manifold.cylinder(
        copperPartThickness * 1.05, // ensure it cuts through
        ph.hole_diameter / 2,
        ph.hole_diameter / 2,
        SMOOTH_CIRCLE_SEGMENTS,
        true,
      )
      manifoldInstancesForCleanup.push(drillForCopper)
      const finalPlatedPartOp = platedPart.subtract(drillForCopper)
      manifoldInstancesForCleanup.push(finalPlatedPartOp)
      const translatedPlatedPart = finalPlatedPartOp.translate([ph.x, ph.y, 0])
      manifoldInstancesForCleanup.push(translatedPlatedPart)
      let finalCopperOp: any = translatedPlatedPart
      if (boardClipVolume) {
        const clipped = Manifold.intersection([
          translatedPlatedPart,
          boardClipVolume,
        ])
        manifoldInstancesForCleanup.push(clipped)
        finalCopperOp = clipped
      }

      // NEW: retain manifold op for upstream subtraction
      platedHoleCopperOpsForSubtract.push(finalCopperOp)

      const threeGeom = manifoldMeshToThreeGeometry(finalCopperOp.getMesh())
      platedHoleCopperGeoms.push({
        key: `ph-${ph.pcb_plated_hole_id || index}`,
        geometry: threeGeom,
        color: COPPER_COLOR,
      })
    } else if (ph.shape === "pill") {
      const holeW = ph.hole_width!
      const holeH = ph.hole_height!

      const defaultPadExtension = 0.4 // 0.2mm pad extension per side
      const outerW = ph.outer_width ?? holeW + defaultPadExtension
      const outerH = ph.outer_height ?? holeH + defaultPadExtension

      // Board Drill
      const drillW = holeW + 2 * MANIFOLD_Z_OFFSET
      const drillH = holeH + 2 * MANIFOLD_Z_OFFSET
      const drillDepth = pcbThickness * 1.2 // Ensure cut-through

      let boardPillDrillOp = createPillOp(drillW, drillH, drillDepth)

      if (ph.ccw_rotation) {
        const rotatedOp = boardPillDrillOp.rotate([0, 0, ph.ccw_rotation])
        manifoldInstancesForCleanup.push(rotatedOp)
        boardPillDrillOp = rotatedOp
      }

      const translatedBoardPillDrill = boardPillDrillOp.translate([
        ph.x,
        ph.y,
        0,
      ])
      manifoldInstancesForCleanup.push(translatedBoardPillDrill)
      platedHoleBoardDrills.push(translatedBoardPillDrill)

      // Copper Part
      const copperPartThickness = pcbThickness + 2 * MANIFOLD_Z_OFFSET

      const outerCopperOpUnrotated = createPillOp(
        outerW,
        outerH,
        copperPartThickness,
      )
      const innerDrillOpUnrotated = createPillOp(
        holeW,
        holeH,
        copperPartThickness * 1.05, // Make drill slightly thicker to ensure cut
      )

      let finalPlatedPartOp = outerCopperOpUnrotated.subtract(
        innerDrillOpUnrotated,
      )
      manifoldInstancesForCleanup.push(finalPlatedPartOp)

      if (ph.ccw_rotation) {
        const rotatedOp = finalPlatedPartOp.rotate([0, 0, ph.ccw_rotation])
        manifoldInstancesForCleanup.push(rotatedOp)
        finalPlatedPartOp = rotatedOp
      }

      const translatedPlatedPart = finalPlatedPartOp.translate([ph.x, ph.y, 0])
      manifoldInstancesForCleanup.push(translatedPlatedPart)

      // NEW: retain manifold op for upstream subtraction
      let finalCopperOp: any = translatedPlatedPart
      if (boardClipVolume) {
        const clipped = Manifold.intersection([
          translatedPlatedPart,
          boardClipVolume,
        ])
        manifoldInstancesForCleanup.push(clipped)
        finalCopperOp = clipped
      }
      platedHoleCopperOpsForSubtract.push(finalCopperOp)

      const threeGeom = manifoldMeshToThreeGeometry(finalCopperOp.getMesh())
      platedHoleCopperGeoms.push({
        key: `ph-${ph.pcb_plated_hole_id || index}`,
        geometry: threeGeom,
        color: COPPER_COLOR,
      })
    } else if (ph.shape === "pill_hole_with_rect_pad") {
      const holeW = ph.hole_width!
      const holeH = ph.hole_height!
      const holeOffsetX = ph.hole_offset_x || 0
      const holeOffsetY = ph.hole_offset_y || 0
      const padWidth = ph.rect_pad_width!
      const padHeight = ph.rect_pad_height!
      const rectBorderRadius = extractRectBorderRadius(ph)
      const padThickness = DEFAULT_SMT_PAD_THICKNESS

      // Board Drill with hole offset
      const drillW = holeW + 2 * MANIFOLD_Z_OFFSET
      const drillH = holeH + 2 * MANIFOLD_Z_OFFSET
      const drillDepth = pcbThickness * 1.2

      let boardPillDrillOp = createPillOp(drillW, drillH, drillDepth).translate(
        [holeOffsetX, holeOffsetY, 0],
      )

      const translatedBoardPillDrill = boardPillDrillOp.translate([
        ph.x,
        ph.y,
        0,
      ])
      manifoldInstancesForCleanup.push(translatedBoardPillDrill)
      platedHoleBoardDrills.push(translatedBoardPillDrill)

      // Create the main fill between pads (centered on the pad, not the hole)
      const mainFill = createRoundedRectPrism({
        Manifold,
        width: padWidth,
        height: padHeight,
        thickness:
          pcbThickness -
          2 * padThickness -
          2 * BOARD_SURFACE_OFFSET.copper +
          0.1, // Fill between pads
        borderRadius: rectBorderRadius,
      })
      manifoldInstancesForCleanup.push(mainFill)

      // Create and position the top pad with hole offset
      const topPad = createRoundedRectPrism({
        Manifold,
        width: padWidth,
        height: padHeight,
        thickness: padThickness,
        borderRadius: rectBorderRadius,
      }).translate([0, 0, pcbThickness / 2 / 2 + BOARD_SURFACE_OFFSET.copper])

      const bottomPad = createRoundedRectPrism({
        Manifold,
        width: padWidth,
        height: padHeight,
        thickness: padThickness,
        borderRadius: rectBorderRadius,
      }).translate([0, 0, -pcbThickness / 2 / 2 - BOARD_SURFACE_OFFSET.copper])
      manifoldInstancesForCleanup.push(topPad, bottomPad)

      // Create the plated barrel at the offset position
      const barrelPill = createPillOp(
        holeW,
        holeH,
        pcbThickness * 1.02, // Slightly taller than board
      ).translate([holeOffsetX, holeOffsetY, 0])
      manifoldInstancesForCleanup.push(barrelPill)

      // Combine all copper parts
      const copperUnion = Manifold.union([
        mainFill,
        topPad,
        bottomPad,
        barrelPill,
      ])
      manifoldInstancesForCleanup.push(copperUnion)

      // Create hole for drilling at the offset position
      const holeCutOp = createPillOp(
        Math.max(holeW - 2 * PLATED_HOLE_LIP_HEIGHT, 0.01),
        Math.max(holeH - 2 * PLATED_HOLE_LIP_HEIGHT, 0.01),
        pcbThickness * 1.2, // Ensure it cuts through
      ).translate([holeOffsetX, holeOffsetY, 0])
      manifoldInstancesForCleanup.push(holeCutOp)

      // Final copper with hole
      const finalCopper = copperUnion.subtract(holeCutOp)
      manifoldInstancesForCleanup.push(finalCopper)

      // Translate the entire assembly to the final position
      const translatedCopper = finalCopper.translate([ph.x, ph.y, 0])
      manifoldInstancesForCleanup.push(translatedCopper)

      let finalCopperOp: any = translatedCopper
      if (boardClipVolume) {
        const clipped = Manifold.intersection([
          translatedCopper,
          boardClipVolume,
        ])
        manifoldInstancesForCleanup.push(clipped)
        finalCopperOp = clipped
      }

      // NEW: retain manifold op for upstream subtraction
      platedHoleCopperOpsForSubtract.push(finalCopperOp)

      const threeGeom = manifoldMeshToThreeGeometry(finalCopperOp.getMesh())
      platedHoleCopperGeoms.push({
        key: `ph-${ph.pcb_plated_hole_id || index}`,
        geometry: threeGeom,
        color: COPPER_COLOR,
      })
    } else if (ph.shape === "circular_hole_with_rect_pad") {
      // Get hole offsets (default to 0 if not specified)
      const holeOffsetX = ph.hole_offset_x || 0
      const holeOffsetY = ph.hole_offset_y || 0

      // Board drill uses the actual hole diameter (consistent with JSCAD path)
      const translatedDrill = createCircleHoleDrill({
        Manifold,
        x: ph.x + holeOffsetX, // Apply hole offset
        y: ph.y + holeOffsetY, // Apply hole offset
        diameter: ph.hole_diameter,
        thickness: pcbThickness,
        segments: SMOOTH_CIRCLE_SEGMENTS,
      })
      manifoldInstancesForCleanup.push(translatedDrill)
      platedHoleBoardDrills.push(translatedDrill)

      // Copper geometry: rectangular pads with hole, connected by a filled area
      const padWidth = ph.rect_pad_width ?? ph.hole_diameter
      const padHeight = ph.rect_pad_height ?? ph.hole_diameter
      const rectBorderRadius = extractRectBorderRadius(ph)
      const padThickness = DEFAULT_SMT_PAD_THICKNESS
      const holeRadius = ph.hole_diameter / 2

      // Create the main fill between pads (centered on the pad, not the hole)
      const mainFill = createRoundedRectPrism({
        Manifold,
        width: padWidth!,
        height: padHeight!,
        thickness:
          pcbThickness -
          2 * padThickness -
          2 * BOARD_SURFACE_OFFSET.copper +
          0.1, // Fill between pads
        borderRadius: rectBorderRadius,
      })
      manifoldInstancesForCleanup.push(mainFill)

      // Create top and bottom pads (slightly thicker to ensure connection)
      const topPad = createRoundedRectPrism({
        Manifold,
        width: padWidth!,
        height: padHeight!,
        thickness: padThickness,
        borderRadius: rectBorderRadius,
      }).translate([0, 0, pcbThickness / 2 / 2 + BOARD_SURFACE_OFFSET.copper])

      const bottomPad = createRoundedRectPrism({
        Manifold,
        width: padWidth!,
        height: padHeight!,
        thickness: padThickness,
        borderRadius: rectBorderRadius,
      }).translate([0, 0, -pcbThickness / 2 / 2 - BOARD_SURFACE_OFFSET.copper])
      manifoldInstancesForCleanup.push(topPad, bottomPad)

      // Create the plated barrel at the offset position
      const barrelCylinder = Manifold.cylinder(
        pcbThickness * 1.02, // Slightly taller than board
        holeRadius,
        holeRadius,
        SMOOTH_CIRCLE_SEGMENTS,
        true,
      ).translate([holeOffsetX, holeOffsetY, 0]) // Apply hole offset to barrel
      manifoldInstancesForCleanup.push(barrelCylinder)

      // Combine all copper parts
      const copperUnion = Manifold.union([
        mainFill,
        topPad,
        bottomPad,
        barrelCylinder,
      ])
      manifoldInstancesForCleanup.push(copperUnion)

      // Create hole for drilling at the offset position
      const holeDrill = Manifold.cylinder(
        pcbThickness * 1.2, // Ensure it cuts through
        Math.max(holeRadius - M, 0.01),
        Math.max(holeRadius - M, 0.01),
        SMOOTH_CIRCLE_SEGMENTS,
        true,
      ).translate([holeOffsetX, holeOffsetY, 0]) // Apply hole offset to drill
      manifoldInstancesForCleanup.push(holeDrill)

      // Final copper with hole
      const finalCopper = copperUnion.subtract(holeDrill)
      manifoldInstancesForCleanup.push(finalCopper)

      // Translate the entire assembly to the final position
      const translatedCopper = finalCopper.translate([ph.x, ph.y, 0])
      manifoldInstancesForCleanup.push(translatedCopper)

      let finalCopperOp: any = translatedCopper
      if (boardClipVolume) {
        const clipped = Manifold.intersection([
          translatedCopper,
          boardClipVolume,
        ])
        manifoldInstancesForCleanup.push(clipped)
        finalCopperOp = clipped
      }

      // NEW: retain manifold op for upstream subtraction
      platedHoleCopperOpsForSubtract.push(finalCopperOp)

      const threeGeom = manifoldMeshToThreeGeometry(finalCopperOp.getMesh())
      platedHoleCopperGeoms.push({
        key: `ph-${ph.pcb_plated_hole_id || index}`,
        geometry: threeGeom,
        color: COPPER_COLOR,
      })
    } else if (ph.shape === "hole_with_polygon_pad") {
      const polygonHole = ph as PcbHoleWithPolygonPad
      if (!polygonHole.pad_outline || polygonHole.pad_outline.length < 3) {
        console.warn(
          `pcb_plated_hole ${polygonHole.pcb_plated_hole_id} missing pad_outline`,
        )
        return
      }

      const holeShape = polygonHole.hole_shape || "circle"
      const holeOffsetX = polygonHole.hole_offset_x || 0
      const holeOffsetY = polygonHole.hole_offset_y || 0
      const holeCenterX = polygonHole.x + holeOffsetX
      const holeCenterY = polygonHole.y + holeOffsetY
      const drillDepth = pcbThickness * 1.2
      const copperPartThickness = pcbThickness + 2 * MANIFOLD_Z_OFFSET
      const insetAmount = 2 * PLATED_HOLE_LIP_HEIGHT

      let outlinePoints: Array<[number, number]> = polygonHole.pad_outline.map(
        (point) => [point.x, point.y],
      )
      if (arePointsClockwise(outlinePoints)) {
        outlinePoints = outlinePoints.reverse()
      }
      const padCrossSection = CrossSection.ofPolygons([outlinePoints])
      manifoldInstancesForCleanup.push(padCrossSection)
      const padPrism = Manifold.extrude(
        padCrossSection,
        copperPartThickness,
        0,
        0,
        [1, 1],
        true,
      )
      manifoldInstancesForCleanup.push(padPrism)
      const translatedPadPrism = padPrism.translate([
        polygonHole.x,
        polygonHole.y,
        0,
      ])
      manifoldInstancesForCleanup.push(translatedPadPrism)

      const translateToHole = (op: any) => {
        const translated = op.translate([holeCenterX, holeCenterY, 0])
        manifoldInstancesForCleanup.push(translated)
        return translated
      }

      const maybeRotatePill = (op: any) => {
        if (
          holeShape === "rotated_pill" &&
          typeof polygonHole.ccw_rotation === "number"
        ) {
          const rotated = op.rotate([0, 0, polygonHole.ccw_rotation])
          manifoldInstancesForCleanup.push(rotated)
          return rotated
        }
        return op
      }

      let boardDrillOp: any | null = null
      let barrelOuter: any | null = null
      let barrelInner: any | null = null
      let holeCutOp: any | null = null

      if (holeShape === "circle") {
        if (typeof polygonHole.hole_diameter !== "number") {
          console.warn(
            `pcb_plated_hole ${polygonHole.pcb_plated_hole_id} missing hole_diameter`,
          )
          return
        }
        const translatedDrill = createCircleHoleDrill({
          Manifold,
          x: holeCenterX,
          y: holeCenterY,
          diameter: polygonHole.hole_diameter,
          thickness: pcbThickness,
          segments: SMOOTH_CIRCLE_SEGMENTS,
        })
        manifoldInstancesForCleanup.push(translatedDrill)
        boardDrillOp = translatedDrill

        const outerCylinder = Manifold.cylinder(
          copperPartThickness,
          polygonHole.hole_diameter / 2,
          polygonHole.hole_diameter / 2,
          SMOOTH_CIRCLE_SEGMENTS,
          true,
        )
        manifoldInstancesForCleanup.push(outerCylinder)
        barrelOuter = translateToHole(outerCylinder)

        const innerDiameter = Math.max(
          polygonHole.hole_diameter - insetAmount,
          M,
        )
        const innerCylinder = Manifold.cylinder(
          copperPartThickness * 1.05,
          innerDiameter / 2,
          innerDiameter / 2,
          SMOOTH_CIRCLE_SEGMENTS,
          true,
        )
        manifoldInstancesForCleanup.push(innerCylinder)
        barrelInner = translateToHole(innerCylinder)

        const drillCut = Manifold.cylinder(
          drillDepth,
          Math.max(innerDiameter / 2, M / 2),
          Math.max(innerDiameter / 2, M / 2),
          SMOOTH_CIRCLE_SEGMENTS,
          true,
        )
        manifoldInstancesForCleanup.push(drillCut)
        holeCutOp = translateToHole(drillCut)
      } else if (
        (holeShape === "oval" ||
          holeShape === "pill" ||
          holeShape === "rotated_pill") &&
        typeof polygonHole.hole_width === "number" &&
        typeof polygonHole.hole_height === "number"
      ) {
        const drillWidth = polygonHole.hole_width + 2 * MANIFOLD_Z_OFFSET
        const drillHeight = polygonHole.hole_height + 2 * MANIFOLD_Z_OFFSET
        let drillOp = createPillOp(drillWidth, drillHeight, drillDepth)
        drillOp = maybeRotatePill(drillOp)
        const translatedDrill = translateToHole(drillOp)
        boardDrillOp = translatedDrill

        let outerPill = createPillOp(
          polygonHole.hole_width,
          polygonHole.hole_height,
          copperPartThickness,
        )
        outerPill = maybeRotatePill(outerPill)
        barrelOuter = translateToHole(outerPill)

        const innerWidth = Math.max(polygonHole.hole_width - insetAmount, M)
        const innerHeight = Math.max(polygonHole.hole_height - insetAmount, M)
        let innerPill = createPillOp(
          innerWidth,
          innerHeight,
          copperPartThickness * 1.05,
        )
        innerPill = maybeRotatePill(innerPill)
        barrelInner = translateToHole(innerPill)

        let holeCutPill = createPillOp(innerWidth, innerHeight, drillDepth)
        holeCutPill = maybeRotatePill(holeCutPill)
        holeCutOp = translateToHole(holeCutPill)
      } else {
        console.warn(
          `pcb_plated_hole ${polygonHole.pcb_plated_hole_id} has unsupported hole_shape`,
        )
      }

      if (boardDrillOp) {
        platedHoleBoardDrills.push(boardDrillOp)
      }

      if (!barrelOuter || !barrelInner || !holeCutOp) {
        return
      }

      const barrelShell = barrelOuter.subtract(barrelInner)
      manifoldInstancesForCleanup.push(barrelShell)
      const padWithHole = translatedPadPrism.subtract(holeCutOp)
      manifoldInstancesForCleanup.push(padWithHole)
      let combinedCopper = Manifold.union([padWithHole, barrelShell])
      manifoldInstancesForCleanup.push(combinedCopper)

      if (boardClipVolume) {
        const clipped = Manifold.intersection([combinedCopper, boardClipVolume])
        manifoldInstancesForCleanup.push(clipped)
        combinedCopper = clipped
      }

      platedHoleCopperOpsForSubtract.push(combinedCopper)
      const threeGeom = manifoldMeshToThreeGeometry(combinedCopper.getMesh())
      platedHoleCopperGeoms.push({
        key: `ph-${polygonHole.pcb_plated_hole_id || index}`,
        geometry: threeGeom,
        color: COPPER_COLOR,
      })
    }
  })

  // NEW: build a single subtraction op from all plated-hole copper ops
  let platedHoleSubtractOp: any = undefined
  if (platedHoleCopperOpsForSubtract.length > 0) {
    platedHoleSubtractOp = Manifold.union(platedHoleCopperOpsForSubtract)
    manifoldInstancesForCleanup.push(platedHoleSubtractOp)
  }

  return { platedHoleBoardDrills, platedHoleCopperGeoms, platedHoleSubtractOp }
}
