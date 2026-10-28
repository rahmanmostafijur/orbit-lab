import { test } from "node:test";
import assert from "node:assert/strict";
import { SCENE_HEIGHT, SCENE_WIDTH, autoLayout } from "./layout.ts";
import { NODE_HEIGHT, NODE_WIDTH } from "./edgeRouting.ts";
import { createWorkspaceFromTemplate, workspaceTemplates } from "./templates.ts";
import type { OrbitWorkspace } from "./types.ts";

const node = (id: string) => ({ id, kind: "service" as const, label: id, note: "", x: 0, y: 0 });
const edge = (source: string, target: string) => ({ id: source + target, source, target, label: "", note: "" });

test("a chain flows left to right", () => {
  const ws: OrbitWorkspace = { name: "c", nodes: ["a", "b", "c"].map(node), edges: [edge("a", "b"), edge("b", "c")] };
  const [a, b, c] = autoLayout(ws).nodes;
  assert.ok(a.x < b.x && b.x < c.x);
});

test("cycles terminate and every node gets a position", () => {
  const ws: OrbitWorkspace = { name: "c", nodes: ["a", "b"].map(node), edges: [edge("a", "b"), edge("b", "a")] };
  assert.equal(autoLayout(ws).nodes.length, 2);
});

for (const template of workspaceTemplates) {
  test(`layout of "${template.name}" stays in the scene with no overlaps`, () => {
    const nodes = autoLayout(createWorkspaceFromTemplate(template)).nodes;
    for (const n of nodes) {
      assert.ok(n.x >= 0 && n.y >= 0 && n.x + NODE_WIDTH <= SCENE_WIDTH && n.y + NODE_HEIGHT <= SCENE_HEIGHT, n.label);
    }
    for (const a of nodes) for (const b of nodes) {
      if (a === b) continue;
      const apart = a.x + NODE_WIDTH <= b.x || b.x + NODE_WIDTH <= a.x || a.y + NODE_HEIGHT <= b.y || b.y + NODE_HEIGHT <= a.y;
      assert.ok(apart, `${a.label} overlaps ${b.label}`);
    }
  });
}
