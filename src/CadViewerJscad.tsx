import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { su } from "@tscircuit/circuit-json-util"
import type { AnyCircuitElement } from "circuit-json"
import type * as React from "react"
import { forwardRef, useCallback, useMemo, useState } from "react"
import type * as THREE from "three"
import { Euler } from "three"
import { AnyCadComponent } from "./AnyCadComponent"
import { CadViewerContainer } from "./CadViewerContainer"
import { useConvertChildrenToCircuitJson } from "./hooks/use-convert-children-to-soup"
import { useStlsFromGeom } from "./hooks/use-stls-from-geom"
import { useBoardGeomBuilder } from "./hooks/useBoardGeomBuilder"
import { Error3d } from "./three-components/Error3d"
import { FootprinterModel } from "./three-components/FootprinterModel"
import { JscadModel } from "./three-components/JscadModel"
import { MixedStlModel } from "./three-components/MixedStlModel"
import { STLModel } from "./three-components/STLModel"
import { VisibleSTLModel } from "./three-components/VisibleSTLModel"
import { ThreeErrorBoundary } from "./three-components/ThreeErrorBoundary"
import { tuple } from "./utils/tuple"
import { boardAnchorPosition, boardBoundingBox } from "./utils/board-anchor"

interface Props {
  /**
   * @deprecated Use circuitJson instead.
   */
  soup?: AnyCircuitElement[]
  circuitJson?: AnyCircuitElement[]
  autoRotateDisabled?: boolean
  clickToInteractEnabled?: boolean
  onUserInteraction?: () => void
}

export const CadViewerJscad = forwardRef<
  THREE.Object3D,
  React.PropsWithChildren<Props>
>(
  (
    {
      soup,
      circuitJson,
      children,
      autoRotateDisabled,
      clickToInteractEnabled,
      onUserInteraction,
    },
    ref,
  ) => {
    const childrenSoup = useConvertChildrenToCircuitJson(children)
    const internalCircuitJson = useMemo(() => {
      const cj = soup ?? circuitJson
      return (cj ?? childrenSoup) as AnyCircuitElement[]
    }, [soup, circuitJson, childrenSoup])

    // Use the new hook to manage board geometry building
    const boardGeom = useBoardGeomBuilder(internalCircuitJson)

    const boardData = useMemo(() => {
      if (!internalCircuitJson) return null
      try {
        return su(internalCircuitJson as any).pcb_board.list()[0] ?? null
      } catch (e) {
        console.error(e)
        return null
      }
    }, [internalCircuitJson])

    const boardBounds = useMemo(() => {
      if (!boardData) return null
      return boardBoundingBox(boardData)
    }, [boardData])

    const boardDimensions = useMemo(() => {
      if (!boardData) return undefined
      if (!boardBounds) {
        return { width: 0, height: 0 }
      }
      return {
        width: boardBounds.maxX - boardBounds.minX,
        height: boardBounds.maxY - boardBounds.minY,
      }
    }, [boardData, boardBounds])

    const boardCenter = useMemo(() => {
      if (!boardData) return undefined
      if (boardBounds) {
        return {
          x: (boardBounds.minX + boardBounds.maxX) / 2,
          y: (boardBounds.minY + boardBounds.maxY) / 2,
        }
      }
      const fallbackAnchor = boardAnchorPosition(boardData)
      return fallbackAnchor ? { x: fallbackAnchor.x, y: fallbackAnchor.y } : undefined
    }, [boardData, boardBounds])

    const initialCameraPosition = useMemo(() => {
      if (!boardDimensions) return [5, 5, 5] as const
      const width = boardDimensions.width ?? 0
      const height = boardDimensions.height ?? 0
      const safeWidth = Math.max(width, 1)
      const safeHeight = Math.max(height, 1)
      const largestDim = Math.max(safeWidth, safeHeight, 5)
      return [largestDim / 2, largestDim / 2, largestDim] as const
    }, [boardDimensions])

    // Use the state `boardGeom` which starts simplified and gets updated
    const { stls: boardStls, loading } = useStlsFromGeom(boardGeom)

    const cad_components = su(internalCircuitJson).cad_component.list()

    return (
      <CadViewerContainer
        ref={ref}
        autoRotateDisabled={autoRotateDisabled}
        initialCameraPosition={initialCameraPosition}
        clickToInteractEnabled={clickToInteractEnabled}
        boardDimensions={boardDimensions}
        boardCenter={boardCenter}
        onUserInteraction={onUserInteraction}
      >
        {boardStls.map(({ stlData, color, layerType }, index) => (
          <VisibleSTLModel
            key={`board-${index}`}
            stlData={stlData}
            color={color}
            opacity={index === 0 ? 0.95 : 1}
            layerType={layerType}
          />
        ))}
        {cad_components.map((cad_component) => (
          <ThreeErrorBoundary
            key={cad_component.cad_component_id}
            fallback={({ error }) => (
              <Error3d cad_component={cad_component} error={error} />
            )}
          >
            <AnyCadComponent
              key={cad_component.cad_component_id}
              cad_component={cad_component}
              circuitJson={internalCircuitJson}
            />
          </ThreeErrorBoundary>
        ))}
      </CadViewerContainer>
    )
  },
)
