import { CadViewer } from "src/CadViewer"

const polygonPadCircuit = [
  {
    type: "pcb_board",
    pcb_board_id: "board-polygon-pad",
    center: { x: 0, y: 0 },
    thickness: 1.6,
    num_layers: 2,
    width: 40,
    height: 30,
    material: "fr4",
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "poly-pad-circle",
    shape: "hole_with_polygon_pad",
    hole_shape: "circle",
    hole_diameter: 1.2,
    pad_outline: [
      { x: -3, y: -1.5 },
      { x: 0, y: -3 },
      { x: 3, y: -1.5 },
      { x: 2.5, y: 1.5 },
      { x: -2.5, y: 1.5 },
    ],
    hole_offset_x: 0.4,
    hole_offset_y: -0.2,
    x: -6,
    y: 0,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "poly-pad-pill",
    shape: "hole_with_polygon_pad",
    hole_shape: "rotated_pill",
    hole_width: 1.2,
    hole_height: 2.6,
    ccw_rotation: 30,
    pad_outline: [
      { x: -2.5, y: -2 },
      { x: 2.2, y: -2.2 },
      { x: 3.2, y: 0 },
      { x: 1, y: 2.6 },
      { x: -1.5, y: 2.6 },
      { x: -3, y: 0.3 },
    ],
    hole_offset_y: 0.4,
    x: 6,
    y: 2,
    layers: ["top", "bottom"],
  },
] as const

export const PolygonPadPlatedHoles = () => (
  <CadViewer circuitJson={polygonPadCircuit as any} />
)

export default {
  title: "Plated Holes/Polygon Pads",
  component: PolygonPadPlatedHoles,
}
