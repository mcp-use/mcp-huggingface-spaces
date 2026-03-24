import {
  McpUseProvider,
  ModelContext,
  useCallTool,
  useWidget,
  type WidgetMetadata,
} from "mcp-use/react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles.css";
import { propSchema, type HFSpace, type SpacesBrowserProps } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description: "Browse and embed Hugging Face Spaces",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: true,
    invoking: "Searching Spaces...",
    invoked: "Spaces loaded",
    csp: {
      frameDomains: ["https://*.hf.space"],
      connectDomains: ["https://huggingface.co"],
      resourceDomains: ["https://huggingface.co"],
    },
  },
};

type FavoritesState = { favorites: string[] };

const SDK_COLORS: Record<string, { bg: string; text: string }> = {
  gradio: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300" },
  streamlit: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300" },
  docker: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
  static: { bg: "bg-gray-100 dark:bg-gray-900/30", text: "text-gray-700 dark:text-gray-300" },
};

function SdkBadge({ sdk }: { sdk: string }) {
  const key = sdk.toLowerCase();
  const colors = SDK_COLORS[key] ?? SDK_COLORS.static;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${colors.bg} ${colors.text}`}
    >
      {sdk}
    </span>
  );
}

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  RUNNING: { dot: "bg-emerald-500", label: "Running" },
  PAUSED: { dot: "bg-amber-500", label: "Paused" },
  BUILDING: { dot: "bg-blue-500 animate-pulse", label: "Building" },
  APP_STARTING: { dot: "bg-blue-400 animate-pulse", label: "Starting" },
  STOPPED: { dot: "bg-gray-400", label: "Stopped" },
  BUILD_ERROR: { dot: "bg-red-500", label: "Build Error" },
  RUNTIME_ERROR: { dot: "bg-red-500", label: "Error" },
};

function StatusBadge({ stage }: { stage: string }) {
  const style = STATUS_STYLES[stage] ?? { dot: "bg-gray-400", label: stage };
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500">
        <path
          fillRule="evenodd"
          d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-gray-400 dark:text-gray-500">
      <path
        d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
      />
    </svg>
  );
}

function SpaceCard({
  space,
  isFavorite,
  onSelect,
  onToggleFavorite,
  index,
}: {
  space: HFSpace;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  index: number;
}) {
  return (
    <div
      className="animate-fade-in group relative flex flex-col rounded-xl border border-gray-200 dark:border-[--color-hf-dark-border] bg-white dark:bg-[--color-hf-dark-card] overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:border-[--color-hf-yellow]/40 hover:-translate-y-0.5"
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onSelect}
    >
      <div className="h-1 w-full bg-gradient-to-r from-[--color-hf-yellow] to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex-1 p-3.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
              {space.title}
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {space.author}
            </p>
          </div>
          <button
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            <HeartIcon filled={isFavorite} />
          </button>
        </div>

        {space.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed mb-2.5">
            {space.description}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <SdkBadge sdk={space.sdk} />
          {space.runtime && <StatusBadge stage={space.runtime.stage} />}
          {space.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="px-3.5 py-2 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
            <span>❤️</span>
            <span>{space.likes.toLocaleString()}</span>
          </span>
          {(space.trendingScore ?? 0) > 0 && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <span>🔥</span>
              <span>{Math.round(space.trendingScore ?? 0)}</span>
            </span>
          )}
          {space.runtime?.hardware && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {space.runtime.hardware}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium text-[--color-hf-yellow] opacity-0 group-hover:opacity-100 transition-opacity">
          Open →
        </span>
      </div>
    </div>
  );
}

function EmbedView({
  space,
  onBack,
  onOpenExternal,
}: {
  space: HFSpace;
  onBack: () => void;
  onOpenExternal: (url: string) => void;
}) {
  const [iframeLoaded, setIframeLoaded] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-[--color-hf-dark-border] bg-white dark:bg-[--color-hf-dark]">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600/50 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
              clipRule="evenodd"
            />
          </svg>
          Back
        </button>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {space.title}
          </h2>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
            {space.author}
          </p>
        </div>

        <button
          onClick={() => onOpenExternal(space.url)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[--color-hf-dark] bg-[--color-hf-yellow] hover:brightness-110 transition-all"
        >
          Open on HF
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
            <path
              fillRule="evenodd"
              d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5zm7.25-.182a.75.75 0 01.75-.75h3.5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V6.56l-5.22 5.22a.75.75 0 11-1.06-1.06l5.22-5.22h-2.22a.75.75 0 01-.75-.75z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className="relative flex-1 min-h-0 bg-gray-50 dark:bg-[--color-hf-dark]">
        {!iframeLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-[--color-hf-yellow] border-t-transparent animate-spin" />
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Loading {space.title}...
              </span>
            </div>
          </div>
        )}
        <iframe
          src={space.embedUrl}
          className={`w-full h-full border-0 ${iframeLoaded ? "animate-iframe-load" : "opacity-0"}`}
          style={{ minHeight: "500px" }}
          onLoad={() => setIframeLoaded(true)}
          allow="accelerometer; camera; encrypted-media; gyroscope; microphone"
          sandbox="allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}

function SearchBar({
  initialQuery,
  isPending,
  onSearch,
}: {
  initialQuery: string;
  isPending: boolean;
  onSearch: (query: string) => void;
}) {
  const [value, setValue] = useState(initialQuery);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSearch(value.trim());
      }}
      className="flex gap-2"
    >
      <div className="relative flex-1">
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search Hugging Face Spaces..."
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[--color-hf-dark-border] bg-white dark:bg-[--color-hf-dark-card] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[--color-hf-yellow]/50 focus:border-[--color-hf-yellow] transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={isPending || !value.trim()}
        className="px-4 py-2 rounded-lg text-sm font-medium text-[--color-hf-dark] bg-[--color-hf-yellow] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isPending ? (
          <div className="w-4 h-4 rounded-full border-2 border-[--color-hf-dark] border-t-transparent animate-spin" />
        ) : (
          "Search"
        )}
      </button>
    </form>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 dark:border-[--color-hf-dark-border] bg-white dark:bg-[--color-hf-dark-card] overflow-hidden"
        >
          <div className="h-1 w-full bg-gray-100 dark:bg-gray-700/30 skeleton-shimmer" />
          <div className="p-3.5 space-y-2.5">
            <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-gray-700/30 skeleton-shimmer" />
            <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-gray-700/30 skeleton-shimmer" />
            <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-700/30 skeleton-shimmer" />
            <div className="flex gap-1.5 pt-1">
              <div className="h-4 w-12 rounded bg-gray-100 dark:bg-gray-700/30 skeleton-shimmer" />
              <div className="h-4 w-10 rounded bg-gray-100 dark:bg-gray-700/30 skeleton-shimmer" />
            </div>
          </div>
          <div className="px-3.5 py-2 border-t border-gray-100 dark:border-gray-700/30">
            <div className="h-3 w-10 rounded bg-gray-100 dark:bg-gray-700/30 skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

const SpacesBrowser: React.FC = () => {
  const {
    props,
    isPending,
    displayMode,
    requestDisplayMode,
    openExternal,
    state,
    setState,
  } = useWidget<SpacesBrowserProps, FavoritesState>();

  const {
    callTool: searchSpaces,
    isPending: isSearching,
  } = useCallTool("search-spaces");

  const spaces = props?.spaces ?? [];
  const query = props?.query ?? "";
  const initialActiveId = props?.activeSpaceId ?? null;

  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(
    () => initialActiveId
  );

  const prevInitialRef = useRef(initialActiveId);
  useEffect(() => {
    if (initialActiveId !== prevInitialRef.current) {
      prevInitialRef.current = initialActiveId;
      setActiveSpaceId(initialActiveId);
    }
  }, [initialActiveId]);

  const favorites = useMemo(() => state?.favorites ?? [], [state]);

  const activeSpace = useMemo(
    () => (activeSpaceId ? spaces.find((s) => s.id === activeSpaceId) ?? null : null),
    [activeSpaceId, spaces]
  );

  const toggleFavorite = useCallback(
    (spaceId: string) => {
      const current = state?.favorites ?? [];
      const next = current.includes(spaceId)
        ? current.filter((id: string) => id !== spaceId)
        : [...current, spaceId];
      setState({ favorites: next });
    },
    [state, setState]
  );

  const handleSelect = useCallback(
    (spaceId: string) => {
      setActiveSpaceId(spaceId);
      requestDisplayMode("fullscreen");
    },
    [requestDisplayMode]
  );

  const handleBack = useCallback(() => {
    setActiveSpaceId(null);
    requestDisplayMode("inline");
  }, [requestDisplayMode]);

  const handleSearch = useCallback(
    (q: string) => {
      searchSpaces({ query: q, sort: "likes", direction: "desc", limit: 12 });
    },
    [searchSpaces]
  );

  const handleOpenExternal = useCallback(
    (url: string) => {
      openExternal(url);
    },
    [openExternal]
  );

  const isFullscreen = displayMode === "fullscreen";

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[--color-hf-yellow] border-t-transparent animate-spin" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Searching Hugging Face Spaces...
            </span>
          </div>
          <SkeletonGrid />
        </div>
      </McpUseProvider>
    );
  }

  if (activeSpace) {
    return (
      <McpUseProvider autoSize>
        <ModelContext
          content={`Viewing embedded HF Space: ${activeSpace.id} (${activeSpace.title} by ${activeSpace.author})`}
        />
        <div style={{ height: isFullscreen ? "100vh" : "600px" }}>
          <EmbedView
            space={activeSpace}
            onBack={handleBack}
            onOpenExternal={handleOpenExternal}
          />
        </div>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider autoSize>
      <ModelContext content={`Browsing HF Spaces${query ? ` for "${query}"` : ""} — ${spaces.length} results`}>
        {favorites.length > 0 && (
          <ModelContext content={`User favorites: ${favorites.join(", ")}`} />
        )}
      </ModelContext>

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[--color-hf-yellow] flex items-center justify-center">
              <span className="text-base leading-none">🤗</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                HF Spaces
              </h1>
              {query && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {spaces.length} result{spaces.length !== 1 ? "s" : ""} for "{query}"
                </p>
              )}
            </div>
          </div>
        </div>

        <SearchBar
          initialQuery={query}
          isPending={isSearching}
          onSearch={handleSearch}
        />

        {isSearching ? (
          <SkeletonGrid />
        ) : spaces.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No spaces found. Try a different search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {spaces.map((space, i) => (
              <SpaceCard
                key={space.id}
                space={space}
                index={i}
                isFavorite={favorites.includes(space.id)}
                onSelect={() => handleSelect(space.id)}
                onToggleFavorite={() => toggleFavorite(space.id)}
              />
            ))}
          </div>
        )}
      </div>
    </McpUseProvider>
  );
};

export default SpacesBrowser;
