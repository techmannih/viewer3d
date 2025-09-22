import { CadViewer } from "src/CadViewer"

const roundedRectPadsCircuit = [
  {
    type: "pcb_board",
    pcb_board_id: "board-rounded-rects",
    center: { x: 0, y: 0 },
    thickness: 1.6,
    num_layers: 2,
    width: 30,
    height: 20,
  },
  {
    type: "pcb_component",
    pcb_component_id: "component-rounded",
    source_component_id: "component-rounded",
    center: { x: 0, y: 0 },
    width: 6,
    height: 6,
    layer: "top",
    rotation: 0,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad-top-rounded",
    pcb_component_id: "component-rounded",
    layer: "top",
    shape: "rect",
    width: 3,
    height: 1.6,
    x: -6,
    y: 0,
    rect_border_radius: 0.4,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad-bottom-rounded",
    pcb_component_id: "component-rounded",
    layer: "bottom",
    shape: "rotated_rect",
    width: 3,
    height: 1.6,
    x: -2,
    y: 0,
    ccw_rotation: 30,
    rect_border_radius: 0.5,
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "ph-rounded",
    x: 6,
    y: 0,
    shape: "circular_hole_with_rect_pad",
    layers: ["top", "bottom"],
    hole_diameter: 1.2,
    rect_pad_width: 3,
    rect_pad_height: 2.4,
    rect_pad_border_radius: 0.6,
  },
] as const

export const RoundedRectPadsDemo = () => (
  <CadViewer circuitJson={roundedRectPadsCircuit as any} />
)

export default {
  title: "Rounded Geometry",
  component: RoundedRectPadsDemo,
}
