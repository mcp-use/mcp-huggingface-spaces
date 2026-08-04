import { ThemeProvider, useToolContext } from "mcp-use/react";
import { SpacesView, type SpaceResult } from "../shared/SpacesView";

export default function SpaceDetail() {
  const view = useToolContext<"show-space">();
  if (view.status === "pending") return <p>Loading Space…</p>;
  if (view.status === "error") return <p role="alert">{view.error.message}</p>;
  return <ThemeProvider><SpacesView data={view.toolOutput as SpaceResult} /></ThemeProvider>;
}
