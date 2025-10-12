import * as THREE from "three"
import type { AnyCircuitElement, PcbBoard } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { createFabricationNoteTextGeoms } from "../geoms/create-geoms-for-fabrication-note-text"
import { FABRICATION_NOTE_COLOR } from "../geoms/create-geoms-for-fabrication-note-path"

const DEFAULT_COLOR = `rgb(${Math.round(FABRICATION_NOTE_COLOR[0] * 255)}, ${Math.round(FABRICATION_NOTE_COLOR[1] * 255)}, ${Math.round(FABRICATION_NOTE_COLOR[2] * 255)})`

function toNumber(value: number | string | undefined, fallback = 0) {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

export function createFabricationNoteTextureForLayer({
  layer,
  circuitJson,
  boardData,
  traceTextureResolution,
  fabricationNoteColor = DEFAULT_COLOR,
}: {
  layer: "top" | "bottom"
  circuitJson: AnyCircuitElement[]
  boardData: PcbBoard
  traceTextureResolution: number
  fabricationNoteColor?: string
}): THREE.CanvasTexture | null {
  const fabricationTexts = su(circuitJson).pcb_fabrication_note_text.list()
  const fabricationPaths = su(circuitJson).pcb_fabrication_note_path.list()

  const textsOnLayer = fabricationTexts.filter((t) => t.layer === layer)
  const pathsOnLayer = fabricationPaths.filter((p) => p.layer === layer)

  if (textsOnLayer.length === 0 && pathsOnLayer.length === 0) {
    return null
  }

  const boardWidth = toNumber(boardData.width, 0)
  const boardHeight = toNumber(boardData.height, 0)
  const boardCenter = {
    x: toNumber(boardData.center?.x, boardWidth / 2),
    y: toNumber(boardData.center?.y, boardHeight / 2),
  }

  const canvas = document.createElement("canvas")
  const canvasWidth = Math.max(
    1,
    Math.floor(boardWidth * traceTextureResolution),
  )
  const canvasHeight = Math.max(
    1,
    Math.floor(boardHeight * traceTextureResolution),
  )
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  if (layer === "bottom") {
    ctx.translate(0, canvasHeight)
    ctx.scale(1, -1)
  }

  ctx.strokeStyle = fabricationNoteColor
  ctx.fillStyle = fabricationNoteColor

  pathsOnLayer.forEach((path) => {
    if (!path.route || path.route.length < 2) return
    ctx.beginPath()
    const strokeWidth = toNumber(path.stroke_width, 0.1)
    ctx.lineWidth = strokeWidth * traceTextureResolution
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    path.route.forEach((point, index) => {
      const canvasX =
        (toNumber(point.x) - boardCenter.x + boardWidth / 2) *
        traceTextureResolution
      const canvasY =
        (-(toNumber(point.y) - boardCenter.y) + boardHeight / 2) *
        traceTextureResolution
      if (index === 0) ctx.moveTo(canvasX, canvasY)
      else ctx.lineTo(canvasX, canvasY)
    })
    ctx.stroke()
  })

  textsOnLayer.forEach((text) => {
    const {
      textOutlines,
      xOffset,
      yOffset,
      anchorPosition,
      fontSize,
    } = createFabricationNoteTextGeoms(text)

    if (textOutlines.length === 0) return

    const textStrokeWidth =
      Math.min(Math.max(0.01, fontSize * 0.1), fontSize * 0.05) *
      traceTextureResolution

    ctx.lineWidth = textStrokeWidth
    ctx.lineCap = "butt"
    ctx.lineJoin = "miter"

    textOutlines.forEach((segment) => {
      if (segment.length === 0) return
      ctx.beginPath()
      segment.forEach((point, index) => {
        const pcbX = point[0] + xOffset + anchorPosition.x
        const pcbY = point[1] + yOffset + anchorPosition.y
        const canvasX =
          (pcbX - boardCenter.x + boardWidth / 2) *
          traceTextureResolution
        const canvasY =
          (-(pcbY - boardCenter.y) + boardHeight / 2) *
          traceTextureResolution
        if (index === 0) ctx.moveTo(canvasX, canvasY)
        else ctx.lineTo(canvasX, canvasY)
      })
      ctx.stroke()
    })
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}
