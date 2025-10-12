import { color } from "bun"
import { CadViewer } from "src/CadViewer"

const fabricationNotesCircuit = [
  {
    type: "pcb_board",
    center: { x: 0, y: 0 },
    width: 40,
    height: 30,
    thickness: 1.6,
    material: "fr4",
    num_layers: 2,
    pcb_board_id: "pcb_board_fab_notes",
  },
  {
    type: "pcb_fabrication_note_text",
    pcb_fabrication_note_text_id: "fabrication_note_text_top",
    text: "Mask keep-out",
    font_size: 1.2,
    layer: "top",
    anchor_alignment: "bottom_left",
    anchor_position: { x: -12, y: 10 },
    color: "#FF0000",
  },
  {
    type: "pcb_fabrication_note_path",
    fabrication_note_path_id: "fabrication_note_path_top",
    layer: "top",
    stroke_width: 0.3,
    route: [
      { x: -14, y: 8 },
      { x: -6, y: 5 },
      { x: -2, y: 2 },
    ],
  },
  {
    type: "pcb_fabrication_note_text",
    pcb_fabrication_note_text_id: "fabrication_note_text_bottom",
    text: "Assembly screws",
    font_size: 1,
    layer: "bottom",
    anchor_alignment: "top_center",
    anchor_position: { x: 12, y: -6 },
  },
  {
    type: "pcb_fabrication_note_path",
    fabrication_note_path_id: "fabrication_note_path_bottom",
    layer: "bottom",
    stroke_width: 0.25,
    route: [
      { x: 15, y: -8 },
      { x: 6, y: -11 },
      { x: 0, y: -12 },
    ],
  },
  {
    type: "pcb_silkscreen_text",
    pcb_silkscreen_text_id: "silkscreen_label",
    text: "Silkscreen Label",
    font_size: 1,
    layer: "top",
    anchor_alignment: "center",
    anchor_position: { x: 0, y: 0 },
  },
]

export const FabricationNotes = () => {
  return <CadViewer circuitJson={fabricationNotesCircuit as any} />
}

export default {
  title: "Fabrication Notes",
  component: FabricationNotes,
}
