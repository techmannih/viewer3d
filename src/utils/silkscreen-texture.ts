import * as THREE from "three"
import type { AnyCircuitElement } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import {
  createSilkscreenTextGeoms,
  PcbTextElementForGeoms,
} from "../geoms/create-geoms-for-silkscreen-text"

export function createSilkscreenTextureForLayer({
  layer,
  circuitJson,
  boardData,
  silkscreenColor = "rgb(255,255,255)",
  traceTextureResolution,
  fabricationNoteColor = "rgb(255,215,0)",
}: {
  layer: "top" | "bottom"
  circuitJson: AnyCircuitElement[]
  boardData: any
  silkscreenColor?: string
  traceTextureResolution: number
  fabricationNoteColor?: string
}): THREE.CanvasTexture | null {
  const pcbSilkscreenTexts = su(circuitJson).pcb_silkscreen_text.list()
  const pcbSilkscreenPaths = su(circuitJson).pcb_silkscreen_path.list()
  const pcbFabricationNoteTexts = su(
    circuitJson,
  ).pcb_fabrication_note_text.list()
  const pcbFabricationNotePaths = su(
    circuitJson,
  ).pcb_fabrication_note_path.list()
  const pcbComponents = su(circuitJson).pcb_component.list()

  const normalizeLayer = (value: any): "top" | "bottom" =>
    value === "bottom" ? "bottom" : "top"

  const textsOnLayer = pcbSilkscreenTexts.filter(
    (t) => normalizeLayer(t.layer) === layer,
  )
  const pathsOnLayer = pcbSilkscreenPaths.filter(
    (p) => normalizeLayer(p.layer) === layer,
  )
  const fabricationTextsOnLayer = pcbFabricationNoteTexts.filter(
    (t) => normalizeLayer(t.layer) === layer,
  )
  const fabricationPathsOnLayer = pcbFabricationNotePaths.filter(
    (p) => normalizeLayer(p.layer) === layer,
  )

  if (
    textsOnLayer.length === 0 &&
    pathsOnLayer.length === 0 &&
    fabricationTextsOnLayer.length === 0 &&
    fabricationPathsOnLayer.length === 0
  ) {
    return null
  }

  const canvas = document.createElement("canvas")
  const canvasWidth = Math.floor(boardData.width * traceTextureResolution)
  const canvasHeight = Math.floor(boardData.height * traceTextureResolution)
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  if (layer === "bottom") {
    ctx.translate(0, canvasHeight)
    ctx.scale(1, -1)
  }

  const boardCenter = boardData.center
    ? { x: boardData.center.x, y: boardData.center.y }
    : { x: 0, y: 0 }

  const componentCenters = new Map<string, { x: number; y: number }>()
  pcbComponents.forEach((component: any) => {
    if (component?.pcb_component_id && component?.center) {
      componentCenters.set(component.pcb_component_id, {
        x: component.center.x,
        y: component.center.y,
      })
    }
  })

  const resolveAnchorPosition = (source: any) => {
    if (source?.anchor_position) {
      return {
        x: source.anchor_position.x,
        y: source.anchor_position.y,
      }
    }

    if (source?.pcb_component_id) {
      const center = componentCenters.get(source.pcb_component_id)
      if (center) {
        return { x: center.x, y: center.y }
      }
    }

    return { x: boardCenter.x, y: boardCenter.y }
  }

  const toCanvas = (point: { x: number; y: number }) => ({
    x:
      (point.x - boardCenter.x + boardData.width / 2) * traceTextureResolution,
    y:
      (-(point.y - boardCenter.y) + boardData.height / 2) *
      traceTextureResolution,
  })

  const drawPaths = (paths: any[], color: string, defaultStroke = 0.1) => {
    paths.forEach((path) => {
      if (!path?.route || path.route.length < 2) return
      ctx.beginPath()
      ctx.strokeStyle = color
      const strokeRaw = path.stroke_width ?? defaultStroke
      const strokeWidth =
        typeof strokeRaw === "number"
          ? strokeRaw
          : parseFloat(strokeRaw) || defaultStroke
      ctx.lineWidth = strokeWidth * traceTextureResolution
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      path.route.forEach((rawPoint: any, index: number) => {
        const canvasPoint = toCanvas({ x: rawPoint.x, y: rawPoint.y })
        if (index === 0) ctx.moveTo(canvasPoint.x, canvasPoint.y)
        else ctx.lineTo(canvasPoint.x, canvasPoint.y)
      })
      ctx.stroke()
    })
  }

  const drawTextElements = (
    elements: any[],
    color: string,
    defaultFontSize = 0.25,
  ) => {
    elements.forEach((textSource) => {
      if (!textSource?.text) return

      const fontSizeRaw = textSource.font_size ?? defaultFontSize
      const fontSize =
        typeof fontSizeRaw === "number"
          ? fontSizeRaw
          : parseFloat(fontSizeRaw) || defaultFontSize
      const anchorPosition = resolveAnchorPosition(textSource)
      const layerValue = normalizeLayer(textSource.layer)
      const rotationRaw =
        textSource.ccw_rotation ?? textSource.rotation ?? 0
      const ccwRotation =
        typeof rotationRaw === "number"
          ? rotationRaw
          : parseFloat(rotationRaw) || 0

      const textElement: PcbTextElementForGeoms = {
        text: textSource.text,
        font_size: fontSize,
        anchor_position: anchorPosition,
        anchor_alignment: textSource.anchor_alignment ?? "center",
        layer: layerValue,
        ccw_rotation,
      }

      const { textOutlines, xOffset, yOffset } =
        createSilkscreenTextGeoms(textElement)

      const textStrokeWidth =
        Math.max(0.01, Math.min(fontSize * 0.1, fontSize * 0.05)) *
        traceTextureResolution

      ctx.lineWidth = textStrokeWidth
      ctx.lineCap = "butt"
      ctx.lineJoin = "miter"
      ctx.strokeStyle = color
      ctx.fillStyle = color

      textOutlines.forEach((segment) => {
        if (!segment || segment.length === 0) return
        ctx.beginPath()
        segment.forEach((point, index) => {
          const pcbPoint = {
            x: point[0] + xOffset + anchorPosition.x,
            y: point[1] + yOffset + anchorPosition.y,
          }
          const canvasPoint = toCanvas(pcbPoint)
          if (index === 0) ctx.moveTo(canvasPoint.x, canvasPoint.y)
          else ctx.lineTo(canvasPoint.x, canvasPoint.y)
        })
        ctx.stroke()
      })
    })
  }

  drawPaths(pathsOnLayer, silkscreenColor, 0.1)
  drawPaths(fabricationPathsOnLayer, fabricationNoteColor, 0.15)
  drawTextElements(textsOnLayer, silkscreenColor)
  drawTextElements(fabricationTextsOnLayer, fabricationNoteColor)
  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
