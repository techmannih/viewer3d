import { useState, useCallback, useRef, useEffect, type CSSProperties } from "react"
import { CadViewerJscad } from "./CadViewerJscad"
import CadViewerManifold from "./CadViewerManifold"
import { useContextMenu } from "./hooks/useContextMenu"
import { useGlobalDownloadGltf } from "./hooks/useGlobalDownloadGltf"
import packageJson from "../package.json"
import {
  LayerVisibilityProvider,
  useLayerVisibility,
} from "./contexts/LayerVisibilityContext"
import { AppearanceMenu } from "./components/AppearanceMenu"

const CadViewerInner = (props: any) => {
  const [engine, setEngine] = useState<"jscad" | "manifold">("manifold")
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [autoRotate, setAutoRotate] = useState(true)
  const [autoRotateUserToggled, setAutoRotateUserToggled] = useState(false)
  const [hoveredMenuIndex, setHoveredMenuIndex] = useState<number | null>(null)
  const { toggleLayer } = useLayerVisibility()

  const {
    menuVisible,
    menuPos,
    menuRef,
    contextMenuEventHandlers,
    setMenuVisible,
  } = useContextMenu({ containerRef })

  const autoRotateUserToggledRef = useRef(autoRotateUserToggled)
  autoRotateUserToggledRef.current = autoRotateUserToggled

  const handleUserInteraction = useCallback(() => {
    if (!autoRotateUserToggledRef.current) {
      setAutoRotate(false)
    }
  }, [])

  const toggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => !prev)
    setAutoRotateUserToggled(true)
  }, [])

  const downloadGltf = useGlobalDownloadGltf()

  const handleMenuClick = (newEngine: "jscad" | "manifold") => {
    setEngine(newEngine)
    setMenuVisible(false)
  }

  useEffect(() => {
    if (!menuVisible) {
      setHoveredMenuIndex(null)
    }
  }, [menuVisible])

  useEffect(() => {
    const stored = window.localStorage.getItem("cadViewerEngine")
    if (stored === "jscad" || stored === "manifold") {
      setEngine(stored)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem("cadViewerEngine", engine)
  }, [engine])

  const viewerKey = props.circuitJson
    ? JSON.stringify(props.circuitJson)
    : undefined

  return (
    <div
      key={viewerKey}
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        userSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      }}
      {...contextMenuEventHandlers}
    >
      {engine === "jscad" ? (
        <CadViewerJscad
          {...props}
          autoRotateDisabled={props.autoRotateDisabled || !autoRotate}
          onUserInteraction={handleUserInteraction}
        />
      ) : (
        <CadViewerManifold
          {...props}
          autoRotateDisabled={props.autoRotateDisabled || !autoRotate}
          onUserInteraction={handleUserInteraction}
        />
      )}
      <div
        style={{
          position: "absolute",
          right: 8,
          top: 8,
          background: "#222",
          color: "#fff",
          padding: "2px 8px",
          borderRadius: 4,
          fontSize: 12,
          opacity: 0.7,
          userSelect: "none",
        }}
      >
        Engine: <b>{engine === "jscad" ? "JSCAD" : "Manifold"}</b>
      </div>
      {menuVisible && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Viewer options"
          style={{
            position: "fixed",
            top: menuPos.y,
            left: menuPos.x,
            background: "#ffffff",
            color: "#0f172a",
            borderRadius: 8,
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)",
            zIndex: 1000,
            minWidth: 220,
            border: "1px solid rgba(15, 23, 42, 0.12)",
            padding: "8px 0",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {(() => {
            const baseItemStyle: CSSProperties = {
              display: "flex",
              alignItems: "center",
              width: "100%",
              background: "transparent",
              border: "none",
              padding: "10px 16px",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              color: "inherit",
              textAlign: "left",
              gap: 12,
            }

            const getItemStyle = (index: number): CSSProperties => ({
              ...baseItemStyle,
              backgroundColor: hoveredMenuIndex === index ? "#f1f5f9" : "transparent",
            })

            const setHover = (index: number | null) => () => setHoveredMenuIndex(index)

            return (
              <>
                <button
                  type="button"
                  role="menuitem"
                  style={getItemStyle(0)}
                  onMouseEnter={setHover(0)}
                  onFocus={setHover(0)}
                  onMouseLeave={setHover(null)}
                  onBlur={setHover(null)}
                  onClick={() =>
                    handleMenuClick(engine === "jscad" ? "manifold" : "jscad")
                  }
                >
                  Switch to {engine === "jscad" ? "Manifold" : "JSCAD"} Engine
                  <span
                    style={{
                      fontSize: 12,
                      marginLeft: "auto",
                      opacity: 0.6,
                      fontWeight: 400,
                    }}
                  >
                    {engine === "jscad" ? "experimental" : "default"}
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={autoRotate}
                  style={getItemStyle(1)}
                  onMouseEnter={setHover(1)}
                  onFocus={setHover(1)}
                  onMouseLeave={setHover(null)}
                  onBlur={setHover(null)}
                  onClick={() => {
                    toggleAutoRotate()
                    setMenuVisible(false)
                  }}
                >
                  <span style={{ width: 16 }}>
                    {autoRotate ? "✔" : ""}
                  </span>
                  Auto rotate
                </button>
                <button
                  type="button"
                  role="menuitem"
                  style={getItemStyle(2)}
                  onMouseEnter={setHover(2)}
                  onFocus={setHover(2)}
                  onMouseLeave={setHover(null)}
                  onBlur={setHover(null)}
                  onClick={() => {
                    downloadGltf()
                    setMenuVisible(false)
                  }}
                >
                  Download GLTF
                </button>
              </>
            )
          })()}
          <AppearanceMenu
            onHoverChange={setHoveredMenuIndex}
            hoveredIndex={hoveredMenuIndex}
            nextIndex={3}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "10px 0 2px 0",
              borderTop: "1px solid rgba(15, 23, 42, 0.08)",
              marginTop: 6,
            }}
          >
            <span
              style={{
                fontSize: 11,
                opacity: 0.55,
                fontWeight: 400,
                color: "#4b5563",
              }}
            >
              @tscircuit/3d-viewer@{packageJson.version}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export const CadViewer = (props: any) => {
  return (
    <LayerVisibilityProvider>
      <CadViewerInner {...props} />
    </LayerVisibilityProvider>
  )
}
