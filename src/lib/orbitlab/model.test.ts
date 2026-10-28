import { test } from "node:test";
import assert from "node:assert/strict";
import { addEdge, findPathEdges, parseWorkspace, pathNodeIds, removeNode, serializeWorkspace } from "./model.ts";
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
