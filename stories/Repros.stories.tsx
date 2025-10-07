import { CadViewer } from "src/CadViewer"
import SilkscreenText from "./assets/silkscreen-text-size.json"
import PlatedHoleEdge from "./assets/plated-hole-edge.json"

export const SilkScreenTextSize = () => (
  <CadViewer circuitJson={SilkscreenText as any} />
)

export const PlatedHoleClippedToBoard = () => (
  <CadViewer circuitJson={PlatedHoleEdge as any} />
)

PlatedHoleClippedToBoard.storyName = "Plated hole copper stays on board"

export default {
  title: "Repros",
  component: SilkScreenTextSize,
}
