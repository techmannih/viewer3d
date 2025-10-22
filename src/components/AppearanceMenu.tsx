import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"
import type React from "react"
import type { LayerVisibilityState } from "../contexts/LayerVisibilityContext"
import { calculateSubmenuPosition } from "../utils/menuPositioning"
import "./ContextMenu.css"

const appearanceLayers: Array<{
  key: keyof LayerVisibilityState
  label: string
}> = [
  { key: "boardBody", label: "Board Body" },
  { key: "topCopper", label: "Top Copper" },
  { key: "bottomCopper", label: "Bottom Copper" },
  { key: "topSilkscreen", label: "Top Silkscreen" },
  { key: "bottomSilkscreen", label: "Bottom Silkscreen" },
  { key: "smtModels", label: "CAD Models" },
]

export const AppearanceMenu = () => {
  const { visibility, toggleLayer } = useLayerVisibility()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const submenuRef = useRef<HTMLDivElement | null>(null)
  const [submenuStyle, setSubmenuStyle] = useState<React.CSSProperties>({
    top: 0,
    left: 0,
  })
  const [positioned, setPositioned] = useState(false)

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !submenuRef.current) return
    const triggerRect = triggerRef.current.getBoundingClientRect()
    const width = submenuRef.current.offsetWidth
    const height = submenuRef.current.offsetHeight
    const nextPosition = calculateSubmenuPosition(triggerRect, {
      width,
      height,
    })
    setSubmenuStyle(nextPosition)
    setPositioned(true)
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    setPositioned(false)
    const frame = window.requestAnimationFrame(() => {
      updatePosition()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    const handle = () => updatePosition()
    window.addEventListener("resize", handle)
    window.addEventListener("scroll", handle, true)
    return () => {
      window.removeEventListener("resize", handle)
      window.removeEventListener("scroll", handle, true)
    }
  }, [open, updatePosition])

  return (
    <div
      className="viewer-context-menu__submenu"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        ref={triggerRef}
        className="viewer-context-menu__item viewer-context-menu__item--submenu"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>Appearance</span>
        <span className="viewer-context-menu__submenu-arrow">›</span>
      </button>
      {open && (
        <div
          ref={submenuRef}
          className="viewer-context-menu viewer-context-menu--submenu"
          style={{
            ...submenuStyle,
            opacity: positioned ? 1 : 0,
            pointerEvents: positioned ? "auto" : "none",
          }}
          role="menu"
        >
          <div className="viewer-context-menu__group-title">Layers</div>
          {appearanceLayers.map(({ key, label }) => {
            const isSelected = visibility[key]
            return (
              <button
                key={key}
                type="button"
                className={`viewer-context-menu__item viewer-context-menu__item--checkbox${isSelected ? " is-selected" : ""}`}
                onClick={(event) => {
                  event.stopPropagation()
                  toggleLayer(key)
                }}
              >
                <span className="viewer-context-menu__indicator">
                  {isSelected ? "✔" : ""}
                </span>
                {label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
