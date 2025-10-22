import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { useLayerVisibility } from "../contexts/LayerVisibilityContext"
import type React from "react"

const subTriggerStyle: React.CSSProperties = {
  borderRadius: 6,
  padding: "8px 12px",
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  outline: "none",
}

const subContentStyle: React.CSSProperties = {
  minWidth: 200,
  backgroundColor: "#fff",
  color: "#1f2933",
  borderRadius: 8,
  padding: 6,
  boxShadow:
    "0px 10px 38px -10px rgba(22, 23, 24, 0.35), 0px 10px 20px -15px rgba(22, 23, 24, 0.2)",
  fontSize: 14,
  fontWeight: 500,
}

const checkboxItemStyle: React.CSSProperties = {
  borderRadius: 6,
  padding: "8px 12px",
  display: "flex",
  alignItems: "center",
  gap: 12,
  cursor: "pointer",
  outline: "none",
  position: "relative",
  paddingLeft: 32,
}

const chevronStyle: React.CSSProperties = {
  marginLeft: "auto",
  fontSize: 12,
  opacity: 0.6,
}

const indicatorStyle: React.CSSProperties = {
  position: "absolute",
  left: 12,
  width: 12,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
}

const highlightHandlers: Pick<
  React.HTMLAttributes<HTMLElement>,
  "onPointerMove" | "onPointerLeave" | "onFocus" | "onBlur"
> = {
  onPointerMove: (event) => {
    event.currentTarget.style.backgroundColor = "#eef2f6"
  },
  onPointerLeave: (event) => {
    event.currentTarget.style.backgroundColor = "transparent"
  },
  onFocus: (event) => {
    event.currentTarget.style.backgroundColor = "#eef2f6"
  },
  onBlur: (event) => {
    event.currentTarget.style.backgroundColor = "transparent"
  },
}

export const AppearanceMenu = () => {
  const { visibility, toggleLayer } = useLayerVisibility()

  return (
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger style={subTriggerStyle} {...highlightHandlers}>
        Appearance
        <span style={chevronStyle}>›</span>
      </DropdownMenu.SubTrigger>
      <DropdownMenu.Portal>
        <DropdownMenu.SubContent
          sideOffset={8}
          side="right"
          align="start"
          collisionPadding={8}
          style={subContentStyle}
        >
          <DropdownMenu.CheckboxItem
            checked={visibility.boardBody}
            onCheckedChange={() => toggleLayer("boardBody")}
            style={checkboxItemStyle}
            {...highlightHandlers}
          >
            <DropdownMenu.ItemIndicator style={indicatorStyle}>
              ✔
            </DropdownMenu.ItemIndicator>
            Board Body
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem
            checked={visibility.topCopper}
            onCheckedChange={() => toggleLayer("topCopper")}
            style={checkboxItemStyle}
            {...highlightHandlers}
          >
            <DropdownMenu.ItemIndicator style={indicatorStyle}>
              ✔
            </DropdownMenu.ItemIndicator>
            Top Copper
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem
            checked={visibility.bottomCopper}
            onCheckedChange={() => toggleLayer("bottomCopper")}
            style={checkboxItemStyle}
            {...highlightHandlers}
          >
            <DropdownMenu.ItemIndicator style={indicatorStyle}>
              ✔
            </DropdownMenu.ItemIndicator>
            Bottom Copper
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem
            checked={visibility.topSilkscreen}
            onCheckedChange={() => toggleLayer("topSilkscreen")}
            style={checkboxItemStyle}
            {...highlightHandlers}
          >
            <DropdownMenu.ItemIndicator style={indicatorStyle}>
              ✔
            </DropdownMenu.ItemIndicator>
            Top Silkscreen
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem
            checked={visibility.bottomSilkscreen}
            onCheckedChange={() => toggleLayer("bottomSilkscreen")}
            style={checkboxItemStyle}
            {...highlightHandlers}
          >
            <DropdownMenu.ItemIndicator style={indicatorStyle}>
              ✔
            </DropdownMenu.ItemIndicator>
            Bottom Silkscreen
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem
            checked={visibility.smtModels}
            onCheckedChange={() => toggleLayer("smtModels")}
            style={checkboxItemStyle}
            {...highlightHandlers}
          >
            <DropdownMenu.ItemIndicator style={indicatorStyle}>
              ✔
            </DropdownMenu.ItemIndicator>
            CAD Models
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.SubContent>
      </DropdownMenu.Portal>
    </DropdownMenu.Sub>
  )
}
