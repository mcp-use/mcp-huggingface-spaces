import { MCPServer } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({
  name: "huggingface-spaces",
  title: "Hugging Face Spaces",
  version: "2.0.0",
  description: "Search and embed Hugging Face Spaces in your chat.",
  basePath: "/mcp",
});

const spaceSchema = z.object({
  id: z.string(), author: z.string(), name: z.string(), title: z.string(),
  description: z.string(), likes: z.number(), sdk: z.string(), tags: z.array(z.string()),
  url: z.string(), embedUrl: z.string(), lastModified: z.string(), trendingScore: z.number(),
  runtime: z.object({ stage: z.string(), hardware: z.string().optional() }).optional(),
});
const spacesResultSchema = z.object({ spaces: z.array(spaceSchema), query: z.string(), activeSpaceId: z.string().nullable() });
type HFSpace = z.infer<typeof spaceSchema>;

const SORT_MAP: Record<string, string> = { likes: "likes", trendingScore: "trendingScore", createdAt: "createdAt", lastModified: "lastModified" };

async function searchSpaces(options: { query?: string; limit?: number; sort?: string; direction?: "desc" | "asc"; sdk?: string; author?: string; status?: string }): Promise<HFSpace[]> {
  const { query = "", limit = 12, sort = "likes", direction = "desc", sdk, author, status } = options;
  const params = new URLSearchParams({ sort: SORT_MAP[sort] || sort, direction: direction === "asc" ? "1" : "-1", limit: String(status ? limit * 3 : limit) });
  for (const field of ["runtime", "cardData", "trendingScore", "likes", "sdk", "author", "lastModified", "tags"]) params.append("expand", field);
  if (query) params.set("search", query);
  if (sdk) params.append("filter", sdk);
  if (author) params.set("author", author);
  const response = await fetch(`https://huggingface.co/api/spaces?${params}`);
  if (!response.ok) throw new Error(`HF API error: ${response.status}`);
  const raw: unknown = await response.json();
  if (!Array.isArray(raw)) throw new Error("HF API returned an invalid response");
  let spaces = raw.map((space: any): HFSpace => ({
    id: space.id, author: space.author ?? space.id.split("/")[0], name: space.id.split("/").pop() ?? space.id,
    title: space.cardData?.title ?? space.id.split("/").pop() ?? space.id, description: space.cardData?.short_description ?? "",
    likes: space.likes ?? 0, sdk: space.sdk ?? "unknown", tags: (space.tags ?? []).slice(0, 5),
    url: `https://huggingface.co/spaces/${space.id}`, embedUrl: `https://${space.id.replace("/", "-")}.hf.space`,
    lastModified: space.lastModified ?? "", trendingScore: space.trendingScore ?? 0,
    runtime: space.runtime ? { stage: space.runtime.stage ?? "UNKNOWN", hardware: typeof space.runtime.hardware?.current === "string" ? space.runtime.hardware.current : undefined } : undefined,
  }));
  if (status) spaces = spaces.filter((space) => space.runtime?.stage.toUpperCase() === status.toUpperCase()).slice(0, limit);
  return spaces;
}

const searchInput = z.object({
  query: z.string().optional(), sort: z.enum(["likes", "trendingScore", "createdAt", "lastModified"]).default("likes"), direction: z.enum(["desc", "asc"]).default("desc"),
  sdk: z.enum(["gradio", "streamlit", "docker", "static"]).optional(), author: z.string().optional(),
  status: z.enum(["RUNNING", "PAUSED", "BUILDING", "STOPPED", "APP_STARTING", "BUILD_ERROR", "RUNTIME_ERROR"]).optional(), limit: z.number().min(1).max(50).default(12),
});

export const searchSpacesTool = server.tool(
  { name: "search-spaces", description: "Search Hugging Face Spaces by keyword with filters for SDK, author, runtime status, and sort options.", inputSchema: searchInput, outputSchema: spacesResultSchema, view: { name: "spaces-browser", description: "Browse and embed Hugging Face Spaces", prefersBorder: true, csp: { frameDomains: ["https://*.hf.space"], connectDomains: ["https://huggingface.co"], resourceDomains: ["https://huggingface.co"] } } },
  async (input) => {
    try {
      const spaces = await searchSpaces(input);
      const data = { spaces, query: input.query ?? "", activeSpaceId: null };
      return { content: [{ type: "text", text: `Found ${spaces.length} Hugging Face Spaces${input.query ? ` for "${input.query}"` : ""}` }], structuredContent: data };
    } catch (error) { return { isError: true, content: [{ type: "text", text: `Failed to search HF Spaces: ${String(error)}` }] }; }
  },
);

export const showSpace = server.tool(
  { name: "show-space", description: "Open a specific Hugging Face Space by its ID (author/name format)", inputSchema: z.object({ spaceId: z.string() }), outputSchema: spacesResultSchema, view: { name: "space-detail", description: "Embedded Hugging Face Space", prefersBorder: true, csp: { frameDomains: ["https://*.hf.space"] } } },
  async ({ spaceId }) => {
    const data = { spaces: [{ id: spaceId, author: spaceId.split("/")[0], name: spaceId.split("/").pop() ?? spaceId, title: spaceId.split("/").pop() ?? spaceId, description: "", likes: 0, sdk: "unknown", tags: [], url: `https://huggingface.co/spaces/${spaceId}`, embedUrl: `https://${spaceId.replace("/", "-")}.hf.space`, lastModified: "", trendingScore: 0 }], query: "", activeSpaceId: spaceId };
    return { content: [{ type: "text", text: `Opened Hugging Face Space: ${spaceId}` }], structuredContent: data };
  },
);

export const trendingSpaces = server.tool(
  { name: "trending-spaces", description: "Show trending Hugging Face Spaces", inputSchema: z.object({ sdk: z.enum(["gradio", "streamlit", "docker", "static"]).optional(), limit: z.number().min(1).max(50).default(12) }), outputSchema: spacesResultSchema, view: { name: "trending-spaces", description: "Trending Hugging Face Spaces", prefersBorder: true, csp: { frameDomains: ["https://*.hf.space"], connectDomains: ["https://huggingface.co"], resourceDomains: ["https://huggingface.co"] } } },
  async ({ sdk, limit }) => {
    try {
      const spaces = await searchSpaces({ limit, sort: "trendingScore", direction: "desc", sdk });
      return { content: [{ type: "text", text: `Showing ${spaces.length} trending Hugging Face Spaces` }], structuredContent: { spaces, query: "trending", activeSpaceId: null } };
    } catch (error) { return { isError: true, content: [{ type: "text", text: `Failed to load trending HF Spaces: ${String(error)}` }] }; }
  },
);

export default server;
