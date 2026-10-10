import test from 'node:test';
import assert from 'node:assert/strict';
import { ENDINGS, OPENING_CHARACTER_SCENES } from '../src/story.js';
import { players } from '../src/config.js';
test('every hero has two nonempty ending scenes and an opening',()=>{for(const p of players){assert.ok(ENDINGS[p.name]?.['1']?.length>2,p.name);assert.ok(ENDINGS[p.name]?.['2']?.length>2,p.name);assert.ok(OPENING_CHARACTER_SCENES[p.id]?.length>2,p.id);}});
test('the source markdown duplicate headings do not overwrite detective ending',()=>{assert.match(ENDINGS['探偵さん']['1'].join(''),/分類の謎/);assert.match(ENDINGS['リリー']['1'].join(''),/至高のひよっこ/);});
