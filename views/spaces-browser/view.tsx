import { ThemeProvider, useToolContext } from "mcp-use/react";
import { SpacesView, type SpaceResult } from "../shared/SpacesView";

export default function SpacesBrowser() {
  const view = useToolContext<"search-spaces">();
  if (view.status === "pending") return <p>Searching Hugging Face Spaces…</p>;
  if (view.status === "error") return <p role="alert">{view.error.message}</p>;
  return <ThemeProvider><SpacesView data={view.toolOutput as SpaceResult} /></ThemeProvider>;
}
