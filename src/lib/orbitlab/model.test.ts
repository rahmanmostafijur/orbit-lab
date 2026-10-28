import { test } from "node:test";
import assert from "node:assert/strict";
import { addEdge, addNode, findPathEdges, parseWorkspace, pasteNodes, pathNodeIds, removeNode, serializeWorkspace } from "./model.ts";
import type { DiagramEdge, OrbitWorkspace } from "./types.ts";

const edge = (id: string, source: string, target: string): DiagramEdge => ({ id, source, target, label: "", note: "" });
// a → b → c → d, plus a shortcut a → c, and e → a pointing the other way
const edges = [edge("ab", "a", "b"), edge("bc", "b", "c"), edge("cd", "c", "d"), edge("ac", "a", "c"), edge("ea", "e", "a")];

test("finds the shortest forward path", () => {
  assert.deepEqual(findPathEdges(edges, "a", "d"), ["ac", "cd"]);
});

test("respects direction unless told not to", () => {
  assert.equal(findPathEdges(edges, "d", "a"), null);
  assert.deepEqual(findPathEdges(edges, "d", "a", false), ["cd", "ac"]);
  assert.deepEqual(findPathEdges(edges, "a", "e", false), ["ea"]);
});

test("same source and target has no path", () => {
  assert.equal(findPathEdges(edges, "a", "a"), null);
});

test("pathNodeIds walks a path in either direction", () => {
  assert.deepEqual(pathNodeIds(edges, "a", ["ac", "cd"]), ["a", "c", "d"]);
  assert.deepEqual(pathNodeIds(edges, "d", ["cd", "ac"]), ["d", "c", "a"]);
});

const ws: OrbitWorkspace = {
  name: "W",
  templateId: "auth",
  nodes: [
    { id: "a", kind: "client", label: "A", note: "<b>x</b>", x: 1, y: 2 },
    { id: "b", kind: "service", label: "B", note: "", x: 3, y: 4 },
  ],
  edges: [{ ...edge("ab", "a", "b"), label: "HTTPS" }],
};

test("addEdge rejects self-links and duplicates in either direction", () => {
  assert.equal(addEdge(ws, "a", "a").edge, null);
  assert.equal(addEdge(ws, "a", "b").edge, null);
  assert.equal(addEdge(ws, "b", "a").edge, null);
});

test("removeNode also removes its connections", () => {
  assert.deepEqual(removeNode(ws, "a").edges, []);
});

test("serialize → parse round-trips, including templateId", () => {
  assert.deepEqual(parseWorkspace(serializeWorkspace(ws)), ws);
});

test("parse rejects junk and drops edges to unknown nodes", () => {
  assert.equal(parseWorkspace("not json"), null);
  const parsed = parseWorkspace(JSON.stringify({ nodes: [{ id: "a", kind: "client" }], edges: [edge("x", "a", "zzz")] }));
  assert.equal(parsed?.edges.length, 0);
});

test("pasteNodes copies nodes with new ids and unique labels, and only the links between them", () => {
  const three: OrbitWorkspace = {
    ...ws,
    nodes: [...ws.nodes, { id: "c", kind: "cache", label: "C", note: "", x: 0, y: 0 }],
    edges: [...ws.edges, edge("bc", "b", "c")],
  };
  const result = pasteNodes(three, three.nodes.slice(0, 2), three.edges);
  assert.equal(result.ids.length, 2);
  const copies = result.workspace.nodes.filter((node) => result.ids.includes(node.id));
  assert.deepEqual(copies.map((node) => node.label), ["A 2", "B 2"]);
  assert.deepEqual(copies.map((node) => [node.x, node.y]), [[33, 34], [35, 36]]);
  const newEdges = result.workspace.edges.slice(three.edges.length);
  assert.equal(newEdges.length, 1, "only a→b is copied; b→c leaves the selection");
  assert.deepEqual([newEdges[0].source, newEdges[0].target], result.ids);
});

test("addNode uses a readable default name and numbers it only on collision", () => {
  const empty: OrbitWorkspace = { name: "n", nodes: [], edges: [] };
  const first = addNode(empty, "gateway");
  assert.equal(first.node.label, "API Gateway");
  assert.equal(addNode(first.workspace, "gateway").node.label, "API Gateway 2");
  assert.equal(addNode(empty, "fastapi").node.label, "FastAPI Service");
});

test("addEdge picks a label from the components it connects", () => {
  const ws: OrbitWorkspace = {
    name: "n",
    nodes: [
      { id: "s", kind: "service", label: "S", note: "", x: 0, y: 0 },
      { id: "d", kind: "database", label: "D", note: "", x: 0, y: 0 },
      { id: "q", kind: "queue", label: "Q", note: "", x: 0, y: 0 },
    ],
    edges: [],
  };
  assert.equal(addEdge(ws, "s", "d").edge?.label, "Read / write");
  const publish = addEdge(ws, "s", "q").edge;
  assert.deepEqual([publish?.label, publish?.kind], ["Publish", "async"]);
  assert.equal(addEdge(ws, "q", "d").edge?.label, "Consume");
});
