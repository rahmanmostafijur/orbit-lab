import { test } from "node:test";
import assert from "node:assert/strict";
import { NODE_HEIGHT, NODE_WIDTH, clipToNode, labelHitsNode, routeEdges } from "./edgeRouting.ts";
import { createWorkspaceFromTemplate, workspaceTemplates } from "./templates.ts";
import { SCENE_HEIGHT, SCENE_WIDTH } from "./layout.ts";

test("clipToNode lands on the node border", () => {
  const c = { x: 100, y: 100 };
  assert.deepEqual(clipToNode(c, { x: 500, y: 100 }), { x: 100 + NODE_WIDTH / 2, y: 100 });
  assert.deepEqual(clipToNode(c, { x: 100, y: 0 }), { x: 100, y: 100 - NODE_HEIGHT / 2 });
});

test("an edge bends around a node sitting on the straight line", () => {
  const nodes = [
    { id: "a", x: 0, y: 0 },
    { id: "b", x: 300, y: 0 },
    { id: "c", x: 600, y: 0 },
  ];
  const route = routeEdges(nodes, [{ id: "ac", source: "a", target: "c", label: "x" }]).get("ac");
  assert.ok(route?.clear);
  assert.match(route.d, /Q/);
  assert.notEqual(route.d.split(" ")[5], String(NODE_HEIGHT / 2)); // control point moved off the line
});

for (const template of workspaceTemplates) {
  test(`template "${template.name}": no edge crosses a node, no label overlaps a node`, () => {
    const ws = createWorkspaceFromTemplate(template);
    const routes = routeEdges(ws.nodes, ws.edges);
    for (const edge of ws.edges) {
      const route = routes.get(edge.id);
      assert.ok(route, edge.id);
      assert.ok(route.clear, `${edge.label} edge ${edge.id} crosses a node`);
      assert.ok(!labelHitsNode(route, ws.nodes), `label "${edge.label}" overlaps a node`);
    }
  });
}

test("every template teaches: notes on every component, typed connections, all inside the scene", () => {
  for (const template of workspaceTemplates) {
    for (const node of template.nodes) {
      assert.ok(node.note, `${template.name}: "${node.label}" has no note`);
      assert.ok(node.x >= 8 && node.x <= SCENE_WIDTH - NODE_WIDTH - 8, `${template.name}: "${node.label}" x`);
      assert.ok(node.y >= 8 && node.y <= SCENE_HEIGHT - NODE_HEIGHT - 8, `${template.name}: "${node.label}" y`);
    }
    for (const edge of template.edges) assert.ok(edge.kind && edge.note, `${template.name}: "${edge.label}" untyped`);
  }
});
