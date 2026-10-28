import { test } from "node:test";
import assert from "node:assert/strict";
import { COALESCE_MS, HISTORY_LIMIT, commit, createHistory, redo, undo } from "./history.ts";

test("undo restores the previous state and redo reapplies it", () => {
  const h = commit(createHistory("a"), "b");
  assert.equal(undo(h).present, "a");
  assert.equal(redo(undo(h)).present, "b");
});

test("a new commit clears the redo stack", () => {
  const h = commit(undo(commit(createHistory("a"), "b")), "c");
  assert.deepEqual(h.future, []);
  assert.equal(redo(h).present, "c");
});

test("same-key commits inside the window merge into one step (one drag = one undo)", () => {
  let h = createHistory(0);
  h = commit(h, 1, "move:n1", 1000);
  h = commit(h, 2, "move:n1", 1100);
  h = commit(h, 3, "move:n1", 1200);
  assert.equal(undo(h).present, 0);
});

test("same key after the window, or a different key, makes a new step", () => {
  let h = commit(createHistory(0), 1, "move:n1", 1000);
  h = commit(h, 2, "move:n1", 1000 + COALESCE_MS);
  assert.equal(undo(h).present, 1);
  h = commit(h, 3, "move:n2", 1000 + COALESCE_MS + 1);
  assert.equal(undo(h).present, 2);
});

test("history is capped", () => {
  let h = createHistory(0);
  for (let i = 1; i <= HISTORY_LIMIT + 20; i += 1) h = commit(h, i);
  assert.equal(h.past.length, HISTORY_LIMIT);
});

test("undo and redo on empty stacks are no-ops", () => {
  const h = createHistory("a");
  assert.equal(undo(h), h);
  assert.equal(redo(h), h);
});
