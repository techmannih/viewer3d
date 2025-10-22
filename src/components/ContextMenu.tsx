import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import type React from "react"
import packageJson from "../../package.json"
import type { CameraPreset } from "../hooks/useCameraController"
import { AppearanceMenu } from "./AppearanceMenu"

interface ContextMenuProps {
  open: boolean
  menuPos: { x: number; y: number }
  engine: "jscad" | "manifold"
  cameraPreset: CameraPreset
  autoRotate: boolean
  onOpenChange: (open: boolean) => void
  onEngineSwitch: (engine: "jscad" | "manifold") => void
  onCameraPresetSelect: (preset: CameraPreset) => void
  onAutoRotateToggle: () => void
  onDownloadGltf: () => void
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

const contentStyle: React.CSSProperties = {
  minWidth: 208,
  backgroundColor: "#fff",
  color: "#1f2933",
  borderRadius: 8,
  padding: 6,
  boxShadow:
    "0px 10px 38px -10px rgba(22, 23, 24, 0.35), 0px 10px 20px -15px rgba(22, 23, 24, 0.2)",
  fontSize: 14,
  fontWeight: 500,
}

const triggerStyle: React.CSSProperties = {
  position: "fixed",
  left: 0,
  top: 0,
  width: 1,
  height: 1,
  pointerEvents: "none",
}

const itemStyle: React.CSSProperties = {
  borderRadius: 6,
  padding: "8px 12px",
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  outline: "none",
  color: "inherit",
  position: "relative",
}

const shortcutStyle: React.CSSProperties = {
  marginLeft: "auto",
  opacity: 0.6,
  fontWeight: 400,
  fontSize: 12,
}

const rightChevronStyle: React.CSSProperties = {
  marginLeft: "auto",
  fontSize: 12,
  opacity: 0.6,
}

const selectableItemStyle: React.CSSProperties = {
  ...itemStyle,
  paddingLeft: 32,
}

const itemIndicatorStyle: React.CSSProperties = {
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

export const ContextMenu = ({
  open,
  menuPos,
  engine,
  cameraPreset,
  autoRotate,
  onOpenChange,
  onEngineSwitch,
  onCameraPresetSelect,
  onAutoRotateToggle,
  onDownloadGltf,
}: ContextMenuProps) => {
  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <DropdownMenu.Trigger asChild>
        <div
          style={{
            ...triggerStyle,
            transform: `translate3d(${menuPos.x}px, ${menuPos.y}px, 0)`,
          }}
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={4}
          side="bottom"
          align="start"
          alignOffset={-4}
          collisionPadding={8}
          style={contentStyle}
        >
          <DropdownMenu.Item
            style={itemStyle}
            {...highlightHandlers}
            onSelect={() => {
              onEngineSwitch(engine === "jscad" ? "manifold" : "jscad")
            }}
          >
            Switch to {engine === "jscad" ? "Manifold" : "JSCAD"} Engine
            <span style={shortcutStyle}>
              {engine === "jscad" ? "experimental" : "default"}
            </span>
          </DropdownMenu.Item>

          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger style={itemStyle} {...highlightHandlers}>
              Camera Position
              <span style={rightChevronStyle}>›</span>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={8}
                side="right"
                align="start"
                collisionPadding={8}
                style={contentStyle}
              >
                <DropdownMenu.RadioGroup
                  value={cameraPreset}
                  onValueChange={(value) =>
                    onCameraPresetSelect(value as CameraPreset)
                  }
                >
                  {cameraOptions.map((option) => (
                    <DropdownMenu.RadioItem
                      key={option}
                      value={option}
                      style={selectableItemStyle}
                      {...highlightHandlers}
                    >
                      <DropdownMenu.ItemIndicator style={itemIndicatorStyle}>
                        ●
                      </DropdownMenu.ItemIndicator>
                      {option}
                    </DropdownMenu.RadioItem>
                  ))}
                </DropdownMenu.RadioGroup>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          <DropdownMenu.CheckboxItem
            checked={autoRotate}
            onCheckedChange={() => onAutoRotateToggle()}
            style={selectableItemStyle}
            {...highlightHandlers}
          >
            <DropdownMenu.ItemIndicator style={itemIndicatorStyle}>
              ✔
            </DropdownMenu.ItemIndicator>
            Auto rotate
          </DropdownMenu.CheckboxItem>

          <DropdownMenu.Item
            style={itemStyle}
            {...highlightHandlers}
            onSelect={() => {
              onDownloadGltf()
            }}
          >
            Download GLTF
          </DropdownMenu.Item>

          <DropdownMenu.Separator
            style={{ margin: "6px -6px", borderTop: "1px solid #e0e6ed" }}
          />
          <AppearanceMenu />

          <DropdownMenu.Separator
            style={{ margin: "6px -6px", borderTop: "1px solid #e0e6ed" }}
          />

          <DropdownMenu.Label
            style={{
              fontSize: 11,
              padding: "4px 8px",
              fontWeight: 400,
              color: "#6b7280",
              textAlign: "center",
            }}
          >
            @tscircuit/3d-viewer@{packageJson.version}
          </DropdownMenu.Label>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
