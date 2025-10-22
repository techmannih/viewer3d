import type React from "react"
import {
  useState,
  useCallback,
  useLayoutEffect,
  useEffect,
  useRef,
} from "react"
import { AppearanceMenu } from "./AppearanceMenu"
import type { CameraPreset } from "../hooks/useCameraController"
import packageJson from "../../package.json"
import {
  calculateMenuPosition,
  calculateSubmenuPosition,
} from "../utils/menuPositioning"
import "./ContextMenu.css"

interface ContextMenuProps {
  menuRef: React.RefObject<HTMLDivElement | null>
  menuPos: { x: number; y: number }
  engine: "jscad" | "manifold"
  cameraPreset: CameraPreset
  autoRotate: boolean
  onEngineSwitch: (engine: "jscad" | "manifold") => void
  onCameraPresetSelect: (preset: CameraPreset) => void
  onAutoRotateToggle: () => void
  onDownloadGltf: () => void
  onRequestClose: () => void
}

const cameraOptions: CameraPreset[] = [
  "Custom",
  "Top Centered",
  "Top Down",
  "Top Left Corner",
  "Top Right Corner",
  "Left Sideview",
  "Right Sideview",
  "Front",
]

export const ContextMenu: React.FC<ContextMenuProps> = ({
  menuRef,
  menuPos,
  engine,
  cameraPreset,
  autoRotate,
  onEngineSwitch,
  onCameraPresetSelect,
  onAutoRotateToggle,
  onDownloadGltf,
  onRequestClose,
}) => {
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({
    top: menuPos.y,
    left: menuPos.x,
  })
  const [isMenuPositioned, setIsMenuPositioned] = useState(false)

  const cameraTriggerRef = useRef<HTMLButtonElement | null>(null)
  const cameraMenuRef = useRef<HTMLDivElement | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraMenuStyle, setCameraMenuStyle] = useState<React.CSSProperties>({
    top: 0,
    left: 0,
  })
  const [isCameraPositioned, setIsCameraPositioned] = useState(false)

  const updateMenuPosition = useCallback(() => {
    if (!menuRef.current) return
    const width = menuRef.current.offsetWidth
    const height = menuRef.current.offsetHeight
    const nextPosition = calculateMenuPosition(menuPos.x, menuPos.y, {
      width,
      height,
    })
    setMenuStyle(nextPosition)
    setIsMenuPositioned(true)
  }, [menuPos.x, menuPos.y, menuRef])

  useLayoutEffect(() => {
    setIsMenuPositioned(false)
    const frame = window.requestAnimationFrame(() => {
      updateMenuPosition()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [menuPos.x, menuPos.y, updateMenuPosition])

  useEffect(() => {
    const handle = () => updateMenuPosition()
    handle()
    window.addEventListener("resize", handle)
    window.addEventListener("scroll", handle, true)
    return () => {
      window.removeEventListener("resize", handle)
      window.removeEventListener("scroll", handle, true)
    }
  }, [updateMenuPosition])

  const updateCameraMenuPosition = useCallback(() => {
    if (!cameraTriggerRef.current || !cameraMenuRef.current) return
    const triggerRect = cameraTriggerRef.current.getBoundingClientRect()
    const width = cameraMenuRef.current.offsetWidth
    const height = cameraMenuRef.current.offsetHeight
    const nextPosition = calculateSubmenuPosition(triggerRect, {
      width,
      height,
    })
    setCameraMenuStyle(nextPosition)
    setIsCameraPositioned(true)
  }, [])

  useLayoutEffect(() => {
    if (!cameraOpen) return
    setIsCameraPositioned(false)
    const frame = window.requestAnimationFrame(() => {
      updateCameraMenuPosition()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [cameraOpen, updateCameraMenuPosition])

  useEffect(() => {
    if (!cameraOpen) return
    const handle = () => updateCameraMenuPosition()
    window.addEventListener("resize", handle)
    window.addEventListener("scroll", handle, true)
    return () => {
      window.removeEventListener("resize", handle)
      window.removeEventListener("scroll", handle, true)
    }
  }, [cameraOpen, updateCameraMenuPosition])

  const closeCameraSubmenu = useCallback(() => {
    setCameraOpen(false)
    setIsCameraPositioned(false)
  }, [])

  const handleCameraPresetSelect = useCallback(
    (preset: CameraPreset) => {
      onCameraPresetSelect(preset)
      closeCameraSubmenu()
      onRequestClose()
    },
    [onCameraPresetSelect, closeCameraSubmenu, onRequestClose],
  )

  const handleEngineSwitch = useCallback(() => {
    onEngineSwitch(engine === "jscad" ? "manifold" : "jscad")
    onRequestClose()
  }, [engine, onEngineSwitch, onRequestClose])

  const handleAutoRotateToggle = useCallback(() => {
    onAutoRotateToggle()
    onRequestClose()
  }, [onAutoRotateToggle, onRequestClose])

  const handleDownload = useCallback(() => {
    onDownloadGltf()
    onRequestClose()
  }, [onDownloadGltf, onRequestClose])

  return (
    <div
      ref={(node) => {
        if (menuRef) {
          menuRef.current = node
        }
        if (node) {
          updateMenuPosition()
        }
      }}
      className="viewer-context-menu"
      style={{
        ...menuStyle,
        opacity: isMenuPositioned ? 1 : 0,
        pointerEvents: isMenuPositioned ? "auto" : "none",
      }}
      role="menu"
    >
      <button
        type="button"
        className="viewer-context-menu__item"
        onClick={handleEngineSwitch}
      >
        <span>Switch to {engine === "jscad" ? "Manifold" : "JSCAD"} Engine</span>
        <span className="viewer-context-menu__meta">
          {engine === "jscad" ? "experimental" : "default"}
        </span>
      </button>

      <div
        className="viewer-context-menu__submenu"
        onMouseEnter={() => setCameraOpen(true)}
        onMouseLeave={() => setCameraOpen(false)}
      >
        <button
          type="button"
          className="viewer-context-menu__item viewer-context-menu__item--submenu"
          ref={cameraTriggerRef}
          onClick={() => setCameraOpen((prev) => !prev)}
        >
          <span>Camera Position</span>
          <span className="viewer-context-menu__meta">{cameraPreset}</span>
          <span className="viewer-context-menu__submenu-arrow">›</span>
        </button>
        {cameraOpen && (
          <div
            ref={cameraMenuRef}
            className="viewer-context-menu viewer-context-menu--submenu"
            style={{
              ...cameraMenuStyle,
              opacity: isCameraPositioned ? 1 : 0,
              pointerEvents: isCameraPositioned ? "auto" : "none",
            }}
            role="menu"
          >
            {cameraOptions.map((option) => {
              const selected = cameraPreset === option
              return (
                <button
                  key={option}
                  type="button"
                  className={`viewer-context-menu__item viewer-context-menu__item--radio${selected ? " is-selected" : ""}`}
                  onClick={() => handleCameraPresetSelect(option)}
                >
                  <span className="viewer-context-menu__indicator">
                    {selected ? "•" : ""}
                  </span>
                  {option}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        className={`viewer-context-menu__item viewer-context-menu__item--checkbox${autoRotate ? " is-selected" : ""}`}
        onClick={handleAutoRotateToggle}
      >
        <span className="viewer-context-menu__indicator">
          {autoRotate ? "✔" : ""}
        </span>
        Auto rotate
      </button>

      <button
        type="button"
        className="viewer-context-menu__item"
        onClick={handleDownload}
      >
        Download GLTF
      </button>

      <div className="viewer-context-menu__separator" role="separator" />
      <AppearanceMenu />

      <div className="viewer-context-menu__separator" role="separator" />
      <div className="viewer-context-menu__label">
        @tscircuit/3d-viewer@{packageJson.version}
      </div>
    </div>
  )
}
