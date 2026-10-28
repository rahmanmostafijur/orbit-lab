import type { ComponentKind, DiagramEdge, DiagramNode, OrbitWorkspace } from "@/lib/orbitlab/types";

export type WorkspaceTemplate = {
  id: string;
  name: string;
  summary: string;
  nodes: Array<Omit<DiagramNode, "id">>;
  edges: Array<Omit<DiagramEdge, "id">>;
};

type TemplateNode = Omit<DiagramNode, "id">;
type TemplateEdge = Omit<DiagramEdge, "id">;

// Edge source/target refer to nodes by array index: "n0" is the first node.
const sync = (source: string, target: string, label: string, note: string, protocol?: string): TemplateEdge => ({
  source,
  target,
  label,
  note,
  kind: "sync",
  ...(protocol ? { protocol } : {}),
});
const async = (source: string, target: string, label: string, note: string, protocol = "Event"): TemplateEdge => ({
  source,
  target,
  label,
  note,
  kind: "async",
  protocol,
});

// Horizontal tiers: edge → app → data, with a CDN and a read replica.
const threeTierNodes: TemplateNode[] = [
  { kind: "client", x: 40, y: 300, label: "Browser", note: "Loads the page and calls the app." },
  { kind: "gateway", x: 280, y: 100, label: "CDN", note: "Serves static assets from the edge, close to users." },
  { kind: "gateway", x: 280, y: 300, label: "Load Balancer", note: "Spreads traffic across app instances; health-checks them." },
  { kind: "service", x: 520, y: 300, label: "Web App", note: "Stateless business logic, so you can add instances to scale." },
  { kind: "cache", x: 780, y: 120, label: "Redis", note: "Sessions and hot reads; saves database round trips." },
  { kind: "database", x: 780, y: 420, label: "Primary DB", note: "System of record; takes every write." },
  { kind: "database", x: 1060, y: 300, label: "Read Replica", note: "Copy of the primary for read-heavy queries; lags slightly." },
  { kind: "external", x: 520, y: 600, label: "Object Storage", note: "User uploads and backups, kept out of the database." },
];

const threeTierEdges: TemplateEdge[] = [
  sync("n0", "n1", "Static assets", "JS, CSS, images", "HTTPS"),
  sync("n0", "n2", "Request", "Page and API calls", "HTTPS"),
  sync("n2", "n3", "Route", "Round-robin to a healthy instance", "HTTP"),
  sync("n3", "n4", "Cache lookup", "Check before hitting the database"),
  sync("n3", "n5", "Writes", "Inserts and updates", "SQL"),
  async("n5", "n6", "Replication", "Streams changes to the replica", "WAL"),
  sync("n3", "n6", "Reads", "Read-only queries", "SQL"),
  sync("n3", "n7", "Uploads", "Store files by key", "HTTPS"),
];

// Top-down: one gateway in front of two APIs, with slow work moved to a worker.
const restFastApiNodes: TemplateNode[] = [
  { kind: "client", x: 480, y: 16, label: "Web / Mobile", note: "Calls the public REST API." },
  { kind: "gateway", x: 480, y: 170, label: "API Gateway", note: "Auth, validation and rate limiting; routes by path." },
  { kind: "fastapi", x: 220, y: 330, label: "Orders API", note: "FastAPI app for /orders; validates input with Pydantic." },
  { kind: "fastapi", x: 740, y: 330, label: "Users API", note: "FastAPI app for /users." },
  { kind: "cache", x: 20, y: 500, label: "Valkey", note: "Read-through cache for hot order data." },
  { kind: "database", x: 480, y: 500, label: "PostgreSQL", note: "System of record shared by both APIs." },
  { kind: "queue", x: 960, y: 500, label: "Job Queue", note: "Defers slow work so requests return fast." },
  { kind: "service", x: 960, y: 660, label: "Worker", note: "Runs queued jobs: emails, exports, retries." },
  { kind: "external", x: 560, y: 660, label: "Email Provider", note: "Third-party email API." },
];

const restFastApiEdges: TemplateEdge[] = [
  sync("n0", "n1", "Request", "JSON over HTTPS", "HTTPS"),
  sync("n1", "n2", "/orders", "Path-based routing", "HTTP"),
  sync("n1", "n3", "/users", "Path-based routing", "HTTP"),
  sync("n2", "n4", "Cache lookup", "Hot orders"),
  sync("n2", "n5", "Read / write", "Orders tables", "SQL"),
  sync("n3", "n5", "Read / write", "Users tables", "SQL"),
  async("n3", "n6", "Enqueue job", "Welcome email after sign-up"),
  async("n6", "n7", "Consume", "One job at a time, with retries"),
  sync("n7", "n8", "Send email", "Provider API call", "HTTPS"),
];

// Hub: the auth service in the middle, guarded by a rate limiter.
const authNodes: TemplateNode[] = [
  { kind: "client", x: 20, y: 340, label: "Client", note: "Signs in, then sends the token with every request." },
  { kind: "gateway", x: 270, y: 340, label: "Public Edge", note: "TLS termination; the identity boundary." },
  { kind: "gateway", x: 520, y: 340, label: "Rate Limiter", note: "Caps login attempts per IP to stop brute force." },
  { kind: "fastapi", x: 770, y: 340, label: "Auth Service", note: "Checks credentials and issues short-lived tokens." },
  { kind: "database", x: 1080, y: 140, label: "Identity DB", note: "Accounts and password hashes, never plain passwords." },
  { kind: "cache", x: 1080, y: 340, label: "Session Cache", note: "Refresh tokens and sessions with a TTL." },
  { kind: "external", x: 770, y: 580, label: "OAuth Provider", note: "Google or GitHub sign-in." },
  { kind: "external", x: 1080, y: 580, label: "Email (OTP)", note: "Sends magic links and one-time codes." },
  { kind: "service", x: 770, y: 100, label: "App API", note: "Verifies the token on every request; no login logic here." },
];

const authEdges: TemplateEdge[] = [
  sync("n0", "n1", "Sign in", "Credentials over TLS", "HTTPS"),
  sync("n1", "n2", "Request", "Every /auth call"),
  sync("n2", "n3", "Allowed", "Only if under the limit", "HTTP"),
  sync("n3", "n4", "Account lookup", "Compare password hash", "SQL"),
  sync("n3", "n5", "Session upsert", "Store refresh token"),
  sync("n3", "n6", "OAuth round trip", "Authorization code flow", "HTTPS"),
  async("n3", "n7", "Send code", "Passwordless login", "HTTPS"),
  sync("n1", "n8", "API call", "Bearer token attached", "HTTPS"),
  sync("n8", "n5", "Session check", "Is the token revoked?"),
];

const microServicesNodes: TemplateNode[] = [
  { kind: "client", x: 112, y: 296, label: "Client", note: "Consumer surface." },
  { kind: "gateway", x: 424, y: 296, label: "Service Mesh", note: "Routing, retries and observability between services." },
  { kind: "service", x: 736, y: 112, label: "Ordering", note: "Owns the order lifecycle and its data." },
  { kind: "service", x: 736, y: 376, label: "Inventory", note: "Owns stock and pricing." },
  { kind: "fastapi", x: 1048, y: 296, label: "Payments", note: "Charges and refunds." },
  { kind: "queue", x: 424, y: 104, label: "Order Events", note: "Domain events other services subscribe to." },
  { kind: "queue", x: 424, y: 472, label: "Payment Events", note: "Notification fan-out." },
  { kind: "database", x: 1048, y: 472, label: "Ledger DB", note: "Financial records; owned by Payments only." },
];

const microServicesEdges: TemplateEdge[] = [
  sync("n0", "n1", "Request", "Public API", "HTTPS"),
  sync("n1", "n2", "Command", "Create order", "gRPC"),
  sync("n1", "n3", "Query", "Read stock", "gRPC"),
  sync("n2", "n4", "Request", "Payment", "gRPC"),
  async("n2", "n5", "Event", "Publish order event"),
  async("n4", "n6", "Event", "Payment event"),
  sync("n4", "n7", "Data", "Persist ledger", "SQL"),
];

// Interview classic: reads dwarf writes, so the cache does most of the work.
const urlShortenerNodes: TemplateNode[] = [
  { kind: "client", x: 20, y: 300, label: "Browser", note: "Opens short links and creates new ones." },
  { kind: "gateway", x: 300, y: 300, label: "Load Balancer", note: "Spreads traffic across stateless API servers." },
  { kind: "service", x: 560, y: 300, label: "Shortener API", note: "POST creates a code; GET answers with a 301/302 redirect." },
  { kind: "cache", x: 860, y: 120, label: "Redirect Cache", note: "Code → URL for hot links; reads outnumber writes ~100:1." },
  { kind: "database", x: 860, y: 300, label: "URL Store", note: "Key-value store of code → long URL, partitioned by code." },
  { kind: "service", x: 560, y: 540, label: "ID Generator", note: "Hands out unique ids; base62 turns them into short codes." },
  { kind: "queue", x: 860, y: 540, label: "Click Events", note: "Keeps analytics off the redirect's hot path." },
  { kind: "service", x: 1104, y: 540, label: "Analytics Worker", note: "Counts clicks per link, in batches." },
];

const urlShortenerEdges: TemplateEdge[] = [
  sync("n0", "n1", "GET /abc123", "Follow a short link", "HTTPS"),
  sync("n1", "n2", "Route", "Any healthy instance", "HTTP"),
  sync("n2", "n3", "Lookup code", "Most requests end here"),
  sync("n2", "n4", "Read on miss", "Then fill the cache"),
  sync("n2", "n5", "Next id", "Only when creating a link", "gRPC"),
  async("n2", "n6", "Click event", "Fire and forget"),
  async("n6", "n7", "Consume", "Batch inserts"),
];

// Real-time: sockets for delivery, pub/sub for fan-out, push for offline users.
const chatNodes: TemplateNode[] = [
  { kind: "client", x: 20, y: 300, label: "Chat Client", note: "Keeps one WebSocket open per device." },
  { kind: "gateway", x: 280, y: 300, label: "Load Balancer", note: "Sticky sessions so a socket stays on one server." },
  { kind: "service", x: 540, y: 160, label: "WebSocket Server", note: "Holds live connections and pushes new messages." },
  { kind: "service", x: 540, y: 460, label: "Chat Service", note: "Checks membership and stores messages." },
  { kind: "queue", x: 820, y: 300, label: "Pub/Sub", note: "Routes each message to the server holding the recipient." },
  { kind: "database", x: 820, y: 600, label: "Message Store", note: "Wide-column store, partitioned by conversation id." },
  { kind: "cache", x: 820, y: 40, label: "Presence Cache", note: "Who is online, with a short TTL." },
  { kind: "external", x: 1100, y: 460, label: "Push Service", note: "APNs / FCM for users who are offline." },
];

const chatEdges: TemplateEdge[] = [
  sync("n0", "n1", "Connect", "Upgrade to WebSocket", "WebSocket"),
  sync("n1", "n2", "Socket", "Long-lived connection", "WebSocket"),
  sync("n2", "n3", "Send message", "Validate and save", "gRPC"),
  sync("n3", "n5", "Persist", "Append to the conversation"),
  async("n3", "n4", "Publish", "One event per message"),
  async("n4", "n2", "Deliver", "Server pushes to the recipient's socket"),
  sync("n2", "n6", "Heartbeat", "Refresh online status"),
  async("n3", "n7", "Notify offline", "Recipient has no open socket", "HTTPS"),
];

// Fan-out on write: posting does the work so reading a feed is one cache read.
const newsFeedNodes: TemplateNode[] = [
  { kind: "client", x: 20, y: 300, label: "App", note: "Posts updates and scrolls the feed." },
  { kind: "gateway", x: 280, y: 300, label: "API Gateway", note: "Auth and routing for every call." },
  { kind: "service", x: 520, y: 100, label: "Post Service", note: "Writes new posts." },
  { kind: "service", x: 520, y: 500, label: "Feed Service", note: "Reads a user's precomputed feed." },
  { kind: "queue", x: 800, y: 40, label: "New Posts", note: "One event per post." },
  { kind: "service", x: 1080, y: 100, label: "Fan-out Worker", note: "Pushes the post id into each follower's feed." },
  { kind: "cache", x: 840, y: 500, label: "Feed Cache", note: "Per-user list of recent post ids." },
  { kind: "database", x: 800, y: 300, label: "Posts DB", note: "Post bodies and media links." },
  { kind: "database", x: 1080, y: 300, label: "Social Graph", note: "Who follows whom." },
];

const newsFeedEdges: TemplateEdge[] = [
  sync("n0", "n1", "Request", "Post or read", "HTTPS"),
  sync("n1", "n2", "Create post", "POST /posts", "HTTP"),
  sync("n1", "n3", "Get feed", "GET /feed", "HTTP"),
  sync("n2", "n7", "Store post", "Write once", "SQL"),
  async("n2", "n4", "Post created", "Hand off the fan-out"),
  async("n4", "n5", "Consume", "Work through followers in batches"),
  sync("n5", "n8", "Followers", "Who should see it", "SQL"),
  sync("n5", "n6", "Push to feeds", "Prepend the post id"),
  sync("n3", "n6", "Read feed ids", "One read per scroll page"),
  sync("n3", "n7", "Hydrate posts", "Fetch bodies by id", "SQL"),
];

// Checkout as a saga: reserve, charge, save, then notify asynchronously.
const checkoutNodes: TemplateNode[] = [
  { kind: "client", x: 20, y: 300, label: "Shopper", note: "Adds items, then checks out." },
  { kind: "gateway", x: 280, y: 300, label: "API Gateway", note: "Auth, rate limits and routing." },
  { kind: "service", x: 560, y: 60, label: "Cart Service", note: "Keeps carts in a fast store until checkout." },
  { kind: "service", x: 560, y: 300, label: "Checkout Service", note: "Runs the order as a saga; undoes steps if one fails." },
  { kind: "service", x: 840, y: 160, label: "Inventory", note: "Reserves stock; releases it if payment fails." },
  { kind: "external", x: 840, y: 440, label: "Payment Provider", note: "Stripe or Adyen; one idempotency key per order." },
  { kind: "database", x: 1104, y: 300, label: "Orders DB", note: "Orders and their status." },
  { kind: "queue", x: 560, y: 560, label: "Order Events", note: "OrderPlaced and friends." },
  { kind: "service", x: 840, y: 640, label: "Email Worker", note: "Sends the confirmation email." },
];

const checkoutEdges: TemplateEdge[] = [
  sync("n0", "n1", "Checkout", "Place order", "HTTPS"),
  sync("n1", "n2", "Add to cart", "Before checkout", "HTTP"),
  sync("n1", "n3", "Place order", "POST /checkout", "HTTP"),
  sync("n3", "n2", "Read cart", "Snapshot the items", "gRPC"),
  sync("n3", "n4", "Reserve stock", "Hold for 10 minutes", "gRPC"),
  sync("n3", "n5", "Charge", "Retry-safe with the idempotency key", "HTTPS"),
  sync("n3", "n6", "Save order", "Status: paid", "SQL"),
  async("n3", "n7", "OrderPlaced", "After the order is saved"),
  async("n7", "n8", "Consume", "Email off the checkout path"),
];

export const workspaceTemplates: WorkspaceTemplate[] = [
  {
    id: "three-tier",
    name: "Three-tier web app",
    summary: "Client, edge, app and data tiers, with a CDN, a load balancer and a read replica.",
    nodes: threeTierNodes,
    edges: threeTierEdges,
  },
  {
    id: "rest-fastapi",
    name: "REST API architecture",
    summary: "A gateway routing to two FastAPI services, with slow work moved to a background worker.",
    nodes: restFastApiNodes,
    edges: restFastApiEdges,
  },
  {
    id: "auth",
    name: "Authentication flow",
    summary: "Rate-limited sign-in with password, OAuth and one-time codes, and token checks on every call.",
    nodes: authNodes,
    edges: authEdges,
  },
  {
    id: "microservices",
    name: "Microservices architecture",
    summary: "Domain services behind a service mesh, talking through events.",
    nodes: microServicesNodes,
    edges: microServicesEdges,
  },
  {
    id: "url-shortener",
    name: "URL shortener",
    summary: "The interview classic: id generation, a read-heavy cache and analytics off the hot path.",
    nodes: urlShortenerNodes,
    edges: urlShortenerEdges,
  },
  {
    id: "chat",
    name: "Chat app",
    summary: "WebSockets for live delivery, pub/sub to reach the right server, push for offline users.",
    nodes: chatNodes,
    edges: chatEdges,
  },
  {
    id: "news-feed",
    name: "News feed",
    summary: "Fan-out on write: posting does the work so reading a feed is a single cache read.",
    nodes: newsFeedNodes,
    edges: newsFeedEdges,
  },
  {
    id: "checkout",
    name: "E-commerce checkout",
    summary: "Reserve stock, charge once, save the order, then notify asynchronously.",
    nodes: checkoutNodes,
    edges: checkoutEdges,
  },
];

function nodeIndex(ref: string) {
  return parseInt(ref.slice(1), 10);
}

function buildNodeIds(name: string, kind: ComponentKind, index: number) {
  const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${safeName}-${kind}-${index}`;
}

export function createWorkspaceFromTemplate(template: WorkspaceTemplate): OrbitWorkspace {
  return {
    name: template.name,
    templateId: template.id,
    nodes: template.nodes.map((node, index) => ({
      id: buildNodeIds(template.id, node.kind, index),
      ...node,
    })),
    edges: template.edges.map((edge, index) => ({
      id: `${template.id}-edge-${index}`,
      ...edge,
      source: buildNodeIds(
        template.id,
        template.nodes[nodeIndex(edge.source)].kind,
        nodeIndex(edge.source),
      ),
      target: buildNodeIds(
        template.id,
        template.nodes[nodeIndex(edge.target)].kind,
        nodeIndex(edge.target),
      ),
    })),
  };
}

export function createEmptyWorkspace(): OrbitWorkspace {
  return {
    name: "Untitled workspace",
    nodes: [],
    edges: [],
  };
}
