import type { AnyCircuitElement, CadComponent } from "circuit-json"
import { su } from "@tscircuit/circuit-json-util"
import { useMemo, useState, useCallback } from "react"
import { useStlsFromGeom } from "./hooks/use-stls-from-geom"
import { CadViewerContainer } from "./CadViewerContainer"
import { MixedStlModel } from "./three-components/MixedStlModel"
import { MathUtils, Quaternion, Vector3 } from "three"
import { GltfModel } from "./three-components/GltfModel"
import { JscadModel } from "./three-components/JscadModel"
import { FootprinterModel } from "./three-components/FootprinterModel"
import { tuple } from "./utils/tuple"
import { Html } from "./react-three/Html"
import { useLayerVisibility } from "./contexts/LayerVisibilityContext"

const AXIS_X = new Vector3(1, 0, 0)
const AXIS_Y = new Vector3(0, 1, 0)
const AXIS_Z = new Vector3(0, 0, 1)

export const AnyCadComponent = ({
  cad_component,
  circuitJson,
}: {
  cad_component: CadComponent
  circuitJson: AnyCircuitElement[]
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const { visibility } = useLayerVisibility()
  const [hoverPosition, setHoverPosition] = useState<
    [number, number, number] | null
  >(null)

  const handleHover = useCallback((e: any) => {
    if (e?.mousePosition) {
      setIsHovered(true)
      setHoverPosition(e.mousePosition)
    } else {
      // If event doesn't have mousePosition, maybe keep previous hover state or clear it
      // For now, let's clear it if the event structure is unexpected
      setIsHovered(false)
      setHoverPosition(null)
    }
  }, [])

  const handleUnhover = useCallback(() => {
    setIsHovered(false)
    setHoverPosition(null)
  }, [])

  const componentName = useMemo(() => {
    return su(circuitJson).source_component.getUsing({
      source_component_id: cad_component.source_component_id,
    })?.name
  }, [circuitJson, cad_component.source_component_id])

  const url =
    cad_component.model_obj_url ??
    cad_component.model_wrl_url ??
    cad_component.model_stl_url
  const gltfUrl = cad_component.model_glb_url ?? cad_component.model_gltf_url
  const rotationValues = useMemo(() => {
    if (!cad_component.rotation) return null

    const parseRotationDeg = (value: unknown) => {
      if (typeof value === "number") return value
      if (typeof value === "string") {
        const match = value.match(/-?\d+(?:\.\d+)?/)
        if (match) return parseFloat(match[0])
      }
      return 0
    }

    return {
      x: parseRotationDeg((cad_component.rotation as any).x),
      y: parseRotationDeg((cad_component.rotation as any).y),
      z: parseRotationDeg((cad_component.rotation as any).z),
    }
  }, [cad_component.rotation])

  const rotationOffset = rotationValues
    ? tuple(
        MathUtils.degToRad(rotationValues.x),
        MathUtils.degToRad(rotationValues.y),
        MathUtils.degToRad(rotationValues.z),
      )
    : undefined

  const rotationQuaternion = useMemo(() => {
    if (!rotationValues) return undefined

    const { x = 0, y = 0, z = 0 } = rotationValues
    if (!x && !y && !z) return undefined

    const quaternion = new Quaternion()

    const applyRotation = (axis: Vector3, angleDeg: number) => {
      if (!angleDeg) return
      const angleRad = MathUtils.degToRad(angleDeg)
      const axisRotation = new Quaternion().setFromAxisAngle(axis, angleRad)
      quaternion.multiply(axisRotation)
    }

    applyRotation(AXIS_Z, z)
    applyRotation(AXIS_Y, y)
    applyRotation(AXIS_X, x)

    return quaternion
  }, [rotationValues])

  let modelComponent: React.ReactNode = null

  if (url) {
    modelComponent = (
      <MixedStlModel
        key={cad_component.cad_component_id}
        url={url}
        position={
          cad_component.position
            ? [
                cad_component.position.x,
                cad_component.position.y,
                cad_component.position.z,
              ]
            : undefined
        }
        rotation={rotationOffset}
        rotationQuaternion={rotationQuaternion}
        scale={cad_component.model_unit_to_mm_scale_factor}
        onHover={handleHover}
        onUnhover={handleUnhover}
        isHovered={isHovered}
      />
    )
  } else if (gltfUrl) {
    modelComponent = (
      <GltfModel
        key={cad_component.cad_component_id}
        gltfUrl={gltfUrl}
        position={
          cad_component.position
            ? [
                cad_component.position.x,
                cad_component.position.y,
                cad_component.position.z,
              ]
            : undefined
        }
        rotation={rotationOffset}
        rotationQuaternion={rotationQuaternion}
        scale={cad_component.model_unit_to_mm_scale_factor}
        onHover={handleHover}
        onUnhover={handleUnhover}
        isHovered={isHovered}
      />
    )
  } else if (cad_component.model_jscad) {
    modelComponent = (
      <JscadModel
        key={cad_component.cad_component_id}
        jscadPlan={cad_component.model_jscad as any}
        rotationOffset={rotationOffset}
        rotationQuaternion={rotationQuaternion}
        scale={cad_component.model_unit_to_mm_scale_factor}
        onHover={handleHover}
        onUnhover={handleUnhover}
        isHovered={isHovered}
      />
    )
  } else if (cad_component.footprinter_string) {
    modelComponent = (
      <FootprinterModel
        positionOffset={
          cad_component.position
            ? [
                cad_component.position.x,
                cad_component.position.y,
                cad_component.position.z,
              ]
            : undefined
        }
        rotationOffset={rotationOffset}
        rotationQuaternion={rotationQuaternion}
        footprint={cad_component.footprinter_string}
        scale={cad_component.model_unit_to_mm_scale_factor}
        onHover={handleHover}
        onUnhover={handleUnhover}
        isHovered={isHovered}
      />
    )
  }

  // Check if models should be visible
  if (!visibility.smtModels) {
    return null
  }

  // Render the model and the tooltip if hovered
  return (
    <>
      {modelComponent}
      {isHovered && hoverPosition ? (
        <Html
          position={hoverPosition}
          style={{
            fontFamily: "sans-serif",
            transform: "translate3d(1rem, 1rem, 0)",
            backgroundColor: "white",
            padding: "5px",
            borderRadius: "3px",
            pointerEvents: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none",
          }}
        >
          {componentName ?? "<unknown>"}
        </Html>
      ) : null}
    </>
  )
}
