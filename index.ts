import { MCPServer, text, widget } from "mcp-use/server";
import { z } from "zod";

const server = new MCPServer({
  name: "huggingface-spaces",
  title: "Hugging Face Spaces",
  version: "1.0.0",
  description: "Search and embed Hugging Face Spaces in your chat",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  icons: [
    { src: "icon.svg", mimeType: "image/svg+xml", sizes: ["512x512"] },
  ],
});

interface HFSpace {
  id: string;
  author: string;
  name: string;
  title: string;
  description: string;
  likes: number;
  sdk: string;
  tags: string[];
  url: string;
  embedUrl: string;
  lastModified: string;
  trendingScore: number;
  runtime?: { stage: string; hardware?: string };
}

const SORT_MAP: Record<string, string> = {
  likes: "likes",
  trendingScore: "trendingScore",
  createdAt: "createdAt",
  lastModified: "lastModified",
};

async function searchSpaces(opts: {
  query?: string;
  limit?: number;
  sort?: string;
  direction?: "desc" | "asc";
  sdk?: string;
  author?: string;
  status?: string;
}): Promise<HFSpace[]> {
  const {
    query = "",
    limit = 12,
    sort = "likes",
    direction = "desc",
    sdk,
    author,
    status,
  } = opts;

  const fetchLimit = status ? limit * 3 : limit;

  const params = new URLSearchParams();
  if (query) params.set("search", query);
  params.set("sort", SORT_MAP[sort] || sort);
  params.set("direction", direction === "asc" ? "1" : "-1");
  params.set("limit", String(fetchLimit));
  params.set(
    "expand",
    "runtime,cardData,trendingScore,likes,sdk,author,lastModified,tags"
  );
  if (sdk) params.append("filter", sdk);
  if (author) params.set("author", author);

  const url = `https://huggingface.co/api/spaces?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HF API error: ${res.status}`);
  const raw = await res.json();

  let spaces: HFSpace[] = raw.map((s: any) => ({
    id: s.id,
    author: s.author ?? s.id.split("/")[0],
    name: s.id.split("/").pop(),
    title: s.cardData?.title ?? s.id.split("/").pop(),
    description: s.cardData?.short_description ?? "",
    likes: s.likes ?? 0,
    sdk: s.sdk ?? "unknown",
    tags: (s.tags ?? []).slice(0, 5),
    url: `https://huggingface.co/spaces/${s.id}`,
    embedUrl: `https://${s.id.replace("/", "-")}.hf.space`,
    lastModified: s.lastModified ?? "",
    trendingScore: s.trendingScore ?? 0,
    runtime: s.runtime
      ? {
          stage: s.runtime.stage ?? "UNKNOWN",
          hardware: s.runtime.hardware?.current,
        }
      : undefined,
  }));

  if (status) {
    spaces = spaces.filter(
      (s) => s.runtime?.stage?.toUpperCase() === status.toUpperCase()
    );
    spaces = spaces.slice(0, limit);
  }

  return spaces;
}

server.tool(
  {
    name: "search-spaces",
    description:
      "Search Hugging Face Spaces by keyword with filters for SDK, author, runtime status, and sort options.",
    schema: z.object({
      query: z
        .string()
        .optional()
        .describe("Search query (e.g., 'image generation', 'text to speech')"),
      sort: z
        .enum(["likes", "trendingScore", "createdAt", "lastModified"])
        .default("likes")
        .describe("Sort field"),
      direction: z
        .enum(["desc", "asc"])
        .default("desc")
        .describe("Sort direction"),
      sdk: z
        .enum(["gradio", "streamlit", "docker", "static"])
        .optional()
        .describe("Filter by SDK framework"),
      author: z.string().optional().describe("Filter by author/organization"),
      status: z
        .enum([
          "RUNNING",
          "PAUSED",
          "BUILDING",
          "STOPPED",
          "APP_STARTING",
          "BUILD_ERROR",
          "RUNTIME_ERROR",
        ])
        .optional()
        .describe("Filter by runtime status (applied client-side)"),
      limit: z
        .number()
        .min(1)
        .max(50)
        .default(12)
        .describe("Number of results"),
    }),
    widget: {
      name: "spaces-browser",
      invoking: "Searching HF Spaces...",
      invoked: "Spaces found",
    },
  },
  async ({ query, sort, direction, sdk, author, status, limit }) => {
    try {
      const spaces = await searchSpaces({
        query,
        limit,
        sort,
        direction,
        sdk,
        author,
        status,
      });
      return widget({
        props: { spaces, query: query ?? "", activeSpaceId: null },
        output: text(
          `Found ${spaces.length} Hugging Face Spaces${query ? ` for "${query}"` : ""}${sdk ? ` (${sdk})` : ""}${status ? ` [${status}]` : ""}`
        ),
      });
    } catch (e) {
      return text(`Failed to search HF Spaces: ${e}`);
    }
  }
);

server.tool(
  {
    name: "show-space",
    description:
      "Open a specific Hugging Face Space by its ID (author/name format)",
    schema: z.object({
      spaceId: z
        .string()
        .describe(
          "Space ID in author/name format (e.g., 'stabilityai/stable-diffusion-3')"
        ),
    }),
    widget: {
      name: "spaces-browser",
      invoking: "Loading Space...",
      invoked: "Space ready",
    },
  },
  async ({ spaceId }) => {
    const embedUrl = `https://${spaceId.replace("/", "-")}.hf.space`;
    return widget({
      props: {
        spaces: [
          {
            id: spaceId,
            author: spaceId.split("/")[0],
            name: spaceId.split("/").pop() ?? spaceId,
            title: spaceId.split("/").pop() ?? spaceId,
            description: "",
            likes: 0,
            sdk: "unknown",
            tags: [],
            url: `https://huggingface.co/spaces/${spaceId}`,
            embedUrl,
            lastModified: "",
            trendingScore: 0,
          },
        ],
        query: "",
        activeSpaceId: spaceId,
      },
      output: text(`Opened Hugging Face Space: ${spaceId}`),
    });
  }
);

server.tool(
  {
    name: "trending-spaces",
    description: "Show trending Hugging Face Spaces",
    schema: z.object({
      sdk: z
        .enum(["gradio", "streamlit", "docker", "static"])
        .optional()
        .describe("Filter by SDK"),
      limit: z.number().default(12).describe("Number of results"),
    }),
    widget: {
      name: "spaces-browser",
      invoking: "Loading trending...",
      invoked: "Trending loaded",
    },
  },
  async ({ sdk, limit }) => {
    const spaces = await searchSpaces({
      limit,
      sort: "trendingScore",
      direction: "desc",
      sdk,
    });
    return widget({
      props: { spaces, query: "trending", activeSpaceId: null },
      output: text(`Showing ${spaces.length} trending Hugging Face Spaces`),
    });
  }
);

server.listen().then(() => {
  console.log("Hugging Face Spaces server running");
});
