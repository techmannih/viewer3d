import { vectorText } from "@jscad/modeling/src/text"
import {
  compose,
  translate,
  rotate,
  applyToPoint,
  Matrix,
} from "transformation-matrix"
import type { PcbFabricationNoteText } from "circuit-json"

type RequiredAnchorPosition = NonNullable<
  PcbFabricationNoteText["anchor_position"]
>

function getAnchorPosition(
  note: PcbFabricationNoteText,
): RequiredAnchorPosition {
  const fallback: RequiredAnchorPosition = { x: 0, y: 0 }
  if (!note.anchor_position) return fallback
  const { x, y } = note.anchor_position
  const parsedX =
    typeof x === "string"
      ? Number.parseFloat(x) || fallback.x
      : (x ?? fallback.x)
  const parsedY =
    typeof y === "string"
      ? Number.parseFloat(y) || fallback.y
      : (y ?? fallback.y)
  return { x: parsedX, y: parsedY }
}

export function createFabricationNoteTextGeoms(
  fabricationNote: PcbFabricationNoteText,
) {
  const rawFontSize = fabricationNote.font_size ?? 0.25
  const parsedFontSize =
    typeof rawFontSize === "string"
      ? Number.parseFloat(rawFontSize) || 0.25
      : rawFontSize
  const fontSize = parsedFontSize || 0.25
  const anchorPosition = getAnchorPosition(fabricationNote)
  if (!fabricationNote.text) {
    return {
      textOutlines: [] as Array<Array<[number, number]>>,
      xOffset: 0,
      yOffset: 0,
      anchorPosition,
      fontSize,
    }
  }

  const textOutlines = vectorText({
    height: fontSize * 0.45,
    input: fabricationNote.text,
  }) as Array<Array<[number, number]>>

  if (textOutlines.length === 0) {
    return { textOutlines, xOffset: 0, yOffset: 0, anchorPosition, fontSize }
  }

  let rotationDegrees = fabricationNote.ccw_rotation ?? 0

  const normalizedOutlines: Array<Array<[number, number]>> = []
  textOutlines.forEach((outline) => {
    if (outline.length === 29) {
      normalizedOutlines.push(outline.slice(0, 15) as Array<[number, number]>)
      normalizedOutlines.push(outline.slice(14, 29) as Array<[number, number]>)
    } else if (outline.length === 17) {
      normalizedOutlines.push(outline.slice(0, 10) as Array<[number, number]>)
      normalizedOutlines.push(outline.slice(9, 17) as Array<[number, number]>)
    } else {
      normalizedOutlines.push(outline as Array<[number, number]>)
    }
  })

  const points = normalizedOutlines.flat()
  const textBounds = {
    minX: Math.min(...points.map((p) => p[0])),
    maxX: Math.max(...points.map((p) => p[0])),
    minY: Math.min(...points.map((p) => p[1])),
    maxY: Math.max(...points.map((p) => p[1])),
  }

  const centerX = (textBounds.minX + textBounds.maxX) / 2
  const centerY = (textBounds.minY + textBounds.maxY) / 2

  let xOffset = -centerX
  let yOffset = -centerY

  const alignment = fabricationNote.anchor_alignment ?? "center"

  if (alignment.includes("right")) {
    xOffset = -textBounds.maxX
  } else if (alignment.includes("left")) {
    xOffset = -textBounds.minX
  }

  if (alignment.includes("top")) {
    yOffset = -textBounds.maxY
  } else if (alignment.includes("bottom")) {
    yOffset = -textBounds.minY
  }

  const transforms: Matrix[] = []

  if (fabricationNote.layer === "bottom") {
    transforms.push(
      translate(centerX, centerY),
      { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      translate(-centerX, -centerY),
    )
    rotationDegrees = -rotationDegrees
  }

  if (rotationDegrees) {
    const rad = (rotationDegrees * Math.PI) / 180
    transforms.push(
      translate(centerX, centerY),
      rotate(rad),
      translate(-centerX, -centerY),
    )
  }

  let transformedOutlines = normalizedOutlines

  if (transforms.length > 0) {
    const matrix = compose(...transforms)
    transformedOutlines = normalizedOutlines.map((outline) =>
      outline.map(([x, y]) => {
        const { x: nx, y: ny } = applyToPoint(matrix, { x, y })
        return [nx, ny] as [number, number]
      }),
    )
  }

  return {
    textOutlines: transformedOutlines,
    xOffset,
    yOffset,
    anchorPosition,
    fontSize,
  }
}
