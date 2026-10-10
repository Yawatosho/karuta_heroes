import test from 'node:test';
import assert from 'node:assert/strict';
import { syncField } from '../src/ui.js';
const card = ndc => ({ ndc });
function fixture(field) {
  const grid = { children: [], replacements: 0, replaceChildren(...nodes) { this.children = nodes; this.replacements++; } };
  const create = () => ({ dataset: {} });
  const update = (node, card) => { node.dataset.ndc = card?.ndc || ''; node.hidden = !card; };
  syncField(grid, field, create, update); grid.replacements = 0;
  return {grid, run: field => syncField(grid,field,create,update)};
}
test('ordinary turns keep every card node and never replace the grid',()=>{
  const field=['010','210','450'].map(card), {grid,run}=fixture(field), original=[...grid.children];
  run(field);run(field);assert.deepEqual(grid.children,original);assert.equal(grid.replacements,0);
});
test('taking one card hides its existing node and leaves the other nodes alone',()=>{
  const {grid,run}=fixture(['010','210','450'].map(card)), original=[...grid.children];
  run([null,card('210'),card('450')]);assert.equal(grid.replacements,0);
  original.forEach((node,i)=>assert.equal(grid.children[i],node));assert.equal(original[0].hidden,true);
});
test('a shuffle moves the same cards and preserves their identity',()=>{
  const {grid,run}=fixture(['010','210','450'].map(card)), [a,b,c]=grid.children;
  run([card('450'),card('010'),card('210')]);assert.deepEqual(grid.children,[c,a,b]);assert.equal(grid.replacements,1);
});
test('empty slots cannot consume a card that is moving to another slot',()=>{
  const {grid,run}=fixture([card('010'),card('210'),null]), [a,b]=grid.children;
  run([null,card('010'),card('210')]);assert.equal(grid.children[1],a);assert.equal(grid.children[2],b);
  assert.equal(new Set(grid.children).size,3);assert.equal(grid.children[0].hidden,true);
});
test('glitch replacements create new cards while an unchanged card stays mounted',()=>{
  const {grid,run}=fixture(['010','210','450'].map(card)), original=[...grid.children];
  run([card('020'),card('210'),card('500')]);assert.notEqual(grid.children[0],original[0]);assert.equal(grid.children[1],original[1]);assert.notEqual(grid.children[2],original[2]);
});
