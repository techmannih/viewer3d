import { useState, useRef, useEffect, type CSSProperties } from "react"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"

interface AppearanceMenuProps {
  onHoverChange: (index: number | null) => void
  hoveredIndex: number | null
  nextIndex: number
}

const separatorStyle: CSSProperties = {
  borderTop: "1px solid rgba(15, 23, 42, 0.08)",
  margin: "6px 0",
}

const baseMenuItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  width: "100%",
  background: "transparent",
  border: "none",
  padding: "10px 16px",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
  color: "#0f172a",
  textAlign: "left",
  gap: 12,
}

const submenuContainerStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  minWidth: 220,
  background: "#ffffff",
  border: "1px solid rgba(15, 23, 42, 0.12)",
  borderRadius: 8,
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)",
  padding: "8px 0",
  zIndex: 1100,
}

const checkmarkCellStyle: CSSProperties = {
  width: 16,
  display: "inline-flex",
  justifyContent: "center",
}

const submenuLayers = [
  { key: "boardBody", label: "Board Body" },
  { key: "topCopper", label: "Top Copper" },
  { key: "bottomCopper", label: "Bottom Copper" },
  { key: "topSilkscreen", label: "Top Silkscreen" },
  { key: "bottomSilkscreen", label: "Bottom Silkscreen" },
  { key: "smtModels", label: "CAD Models" },
] as const

type LayerKey = (typeof submenuLayers)[number]["key"]

export const AppearanceMenu = ({
  onHoverChange,
  hoveredIndex,
  nextIndex,
}: AppearanceMenuProps) => {
  const { visibility, toggleLayer } = useLayerVisibility()
  const [showSubmenu, setShowSubmenu] = useState(false)
  const [hoveredSubIndex, setHoveredSubIndex] = useState<number | null>(null)
  const [submenuAlign, setSubmenuAlign] = useState<"left" | "right">("right")
  const triggerRef = useRef<HTMLDivElement | null>(null)
  const submenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!showSubmenu) {
      return
    }

    const trigger = triggerRef.current
    const submenu = submenuRef.current

    if (!trigger || !submenu) {
      return
    }

    const triggerRect = trigger.getBoundingClientRect()
    const submenuRect = submenu.getBoundingClientRect()
    const viewportPadding = 8

    if (
      triggerRect.right + submenuRect.width >
      window.innerWidth - viewportPadding
    ) {
      setSubmenuAlign("left")
    } else {
      setSubmenuAlign("right")
    }
  }, [showSubmenu])

  const getSubmenuItemStyle = (index: number): CSSProperties => ({
    ...baseMenuItemStyle,
    fontWeight: 400,
    backgroundColor: hoveredSubIndex === index ? "#f1f5f9" : "transparent",
  })

  const handleLayerToggle = (layer: LayerKey) => {
    toggleLayer(layer)
  }

  return (
    <>
      <div style={separatorStyle} />
      <div
        ref={triggerRef}
        style={{ position: "relative" }}
        onMouseEnter={() => {
          setShowSubmenu(true)
          onHoverChange(nextIndex)
        }}
        onMouseLeave={() => {
          setShowSubmenu(false)
          onHoverChange(null)
          setHoveredSubIndex(null)
        }}
        onFocusCapture={() => {
          setShowSubmenu(true)
          onHoverChange(nextIndex)
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setShowSubmenu(false)
            onHoverChange(null)
            setHoveredSubIndex(null)
          }
        }}
      >
        <button
          type="button"
          role="menuitem"
          aria-haspopup="true"
          aria-expanded={showSubmenu}
          style={{
            ...baseMenuItemStyle,
            justifyContent: "space-between",
            backgroundColor:
              hoveredIndex === nextIndex || showSubmenu ? "#f1f5f9" : "transparent",
          }}
        >
          Appearance
          <span
            style={{
              fontSize: 11,
              opacity: 0.7,
              transition: "transform 0.2s",
              transform: showSubmenu ? "rotate(90deg)" : "rotate(0deg)",
            }}
          >
            ▶
          </span>
        </button>
        {showSubmenu && (
          <div
            ref={submenuRef}
            role="menu"
            aria-label="Appearance options"
            style={{
              ...submenuContainerStyle,
              left: submenuAlign === "right" ? "100%" : undefined,
              right: submenuAlign === "left" ? "100%" : undefined,
              marginLeft: submenuAlign === "right" ? 6 : undefined,
              marginRight: submenuAlign === "left" ? 6 : undefined,
            }}
          >
            {submenuLayers.map(({ key, label }, index) => (
              <button
                key={key}
                type="button"
                role="menuitemcheckbox"
                aria-checked={visibility[key]}
                style={getSubmenuItemStyle(index)}
                onMouseEnter={() => setHoveredSubIndex(index)}
                onMouseLeave={() => setHoveredSubIndex(null)}
                onFocus={() => setHoveredSubIndex(index)}
                onBlur={() => setHoveredSubIndex(null)}
                onClick={() => handleLayerToggle(key)}
              >
                <span style={checkmarkCellStyle}>
                  {visibility[key] ? "✔" : ""}
                </span>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
