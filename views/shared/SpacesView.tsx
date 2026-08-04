import { useState } from "react";
import { ModelContext, useCallTool, useOpenExternal } from "mcp-use/react";
import "./view.css";

export type Space = { id: string; author: string; name: string; title: string; description: string; likes: number; sdk: string; tags: string[]; url: string; embedUrl: string; lastModified: string; trendingScore: number; runtime?: { stage: string; hardware?: string } };
export type SpaceResult = { spaces: Space[]; query: string; activeSpaceId: string | null };

export function SpacesView({ data }: { data: SpaceResult }) {
  const search = useCallTool("search-spaces");
  const openExternal = useOpenExternal();
  const [activeId, setActiveId] = useState<string | null>(data.activeSpaceId);
  const [query, setQuery] = useState(data.query === "trending" ? "" : data.query);
  const spaces = data.spaces;
  const active = activeId ? spaces.find((space) => space.id === activeId) : undefined;

  if (active) {
    return <main className="hf-root"><ModelContext content={`Viewing embedded HF Space: ${active.id} (${active.title} by ${active.author})`} /><header className="hf-header"><button type="button" onClick={() => setActiveId(null)}>← Back</button><strong>{active.title}</strong><button type="button" onClick={() => void openExternal({ url: active.url })}>Open on HF ↗</button></header><iframe title={active.title} src={active.embedUrl} className="hf-frame" sandbox="allow-forms allow-modals allow-popups allow-same-origin allow-scripts" allow="accelerometer; camera; encrypted-media; gyroscope; microphone" /></main>;
  }

  return <main className="hf-root"><ModelContext content={`Browsing HF Spaces${data.query ? ` for "${data.query}"` : ""} — ${spaces.length} results`} /><header><h1>🤗 HF Spaces</h1><form onSubmit={(event) => { event.preventDefault(); if (query.trim()) void search.callTool({ query: query.trim(), sort: "likes", direction: "desc", limit: 12 }); }}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Hugging Face Spaces…" /><button type="submit" disabled={search.isPending || !query.trim()}>{search.isPending ? "Searching…" : "Search"}</button></form></header>{spaces.length === 0 ? <p className="hf-empty">No spaces found. Try a different search.</p> : <section className="hf-grid">{spaces.map((space) => <button type="button" className="hf-card" key={space.id} onClick={() => setActiveId(space.id)}><strong>{space.title}</strong><span>{space.author}</span>{space.description && <p>{space.description}</p>}<small>{space.sdk} · ❤️ {space.likes.toLocaleString()}{space.runtime ? ` · ${space.runtime.stage}` : ""}</small></button>)}</section>}</main>;
}
