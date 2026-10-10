import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSave, SAVE_KEY } from '../src/save.js';
import { players } from '../src/config.js';

const defaults = { settings: { sound: true, volume: .8, motion: true }, unlocked: [], artworks: [], progress: null, tutorialSeen: false };
const galleryKey = 'karutaGalleryProgressV1', storyKey = 'karutaStoryProgressV1', tutorialKey = 'karutaTutorialProgressV1';
const oldStory = (extra = {}) => ({version:1,playerId:'lily',difficulty:'hard',stageIndex:2,phase:'battle',openingSceneIndex:0,endingSceneNumber:1,...extra});
function storageFixture(values = {}) {
  const data = new Map(Object.entries(values).map(([k,v]) => [k, JSON.stringify(v)]));
  const writes = [];
  return { data, writes, getItem: k => data.get(k) ?? null, setItem(k,v) { writes.push(k); data.set(k,v); } };
}

test('fresh installs do not create a save or mark migration before legacy data exists', () => {
  const storage = storageFixture();
  const saved = loadSave(storage, defaults);
  assert.deepEqual(saved, defaults);
  assert.equal(storage.writes.length, 0);
  saved.artworks.push(1); saved.unlocked.push('cutin/cutin_lib.webp'); saved.settings.volume = 0;
  assert.deepEqual(defaults.artworks, []); assert.deepEqual(defaults.unlocked, []); assert.equal(defaults.settings.volume, .8);
  storage.data.set(galleryKey, JSON.stringify({artworks:['artwork/artwork01.webp']}));
  assert.deepEqual(loadSave(storage, defaults).artworks, [1]);
});

test('legacy gallery preserves all categories, portrait art and PNG assets while rejecting invalid unlocks', () => {
  const storage = storageFixture({ [galleryKey]: {
    cutins:['cutin/cutin_lib.png?v=3','cutin/cutin_lib.webp', 'cutin/cutin_enemy4.webp',null,123,'cutin/nope.webp'],
    victories:['victory_tate/win_det_tate.webp','round/round_enemy2.png','victory/win_enemy4.webp','../bad.webp'],
    endings:['opening/op_common_tate.png?cache=1','opening/op_flib_tate.webp','ending_tate/ending_lily2_tate.webp'],
    artworks:['artwork/artwork01.png','artwork/artwork01.webp','artwork/artwork25.webp?v=1','artwork/artwork00.webp','artwork/artwork26.webp',5]
  } });
  const oldBytes = storage.getItem(galleryKey);
  const saved = loadSave(storage, defaults);
  assert.deepEqual(saved.unlocked, ['cutin/cutin_lib.webp','cutin/cutin_enemy4.webp','victory/win_det.webp','round/round_enemy2.webp','victory/win_enemy4.webp','opening/op_common.webp','opening/op_flib.webp','ending/ending_lily2.webp']);
  assert.deepEqual(saved.artworks, [1,25]);
  assert.equal(saved.legacyImported, true);
  assert.equal(storage.getItem(galleryKey), oldBytes);
  assert.deepEqual(storage.writes, [SAVE_KEY]);
});

test('all heroes resume legacy opening, battle and both ending scenes with the original difficulty and stage', () => {
  for (const player of players) for (const [phase, scene] of [['opening',0],['opening',3],['battle',0],['ending',0],['ending',1]]) {
    const storage = storageFixture({[storyKey]: oldStory({playerId:player.id,phase,openingSceneIndex:scene,endingSceneNumber:scene+1})});
    const saved = loadSave(storage, defaults);
    assert.deepEqual(saved.progress, {player:player.id,difficulty:'hard',stage:2,phase,scene});
    assert.equal(storage.getItem(storyKey), JSON.stringify(oldStory({playerId:player.id,phase,openingSceneIndex:scene,endingSceneNumber:scene+1})));
  }
});

test('new progress and settings take priority while legacy gallery and tutorial completion merge', () => {
  const progress = {player:'professor',difficulty:'easy',stage:1,phase:'opening',scene:2};
  const storage = storageFixture({
    [SAVE_KEY]:{...defaults,settings:{sound:false,volume:.35,motion:false},progress,unlocked:['cutin/cutin_prof.webp'],artworks:[7]},
    [storyKey]:oldStory(), [tutorialKey]:{version:1,completed:true,skillSeen:['lily']},
    [galleryKey]:{cutins:['cutin/cutin_lib.webp','cutin/cutin_prof.webp'],artworks:['artwork/artwork07.webp','artwork/artwork12.webp']}
  });
  const legacyBytes = [storyKey,tutorialKey,galleryKey].map(k=>storage.getItem(k));
  const saved = loadSave(storage, defaults);
  assert.deepEqual(saved.progress, progress);
  assert.deepEqual(saved.settings,{sound:false,volume:.35,motion:false});
  assert.deepEqual(saved.unlocked,['cutin/cutin_prof.webp','cutin/cutin_lib.webp']);
  assert.deepEqual(saved.artworks,[7,12]); assert.equal(saved.tutorialSeen,true);
  assert.deepEqual([storyKey,tutorialKey,galleryKey].map(k=>storage.getItem(k)),legacyBytes);
});

test('a completed new story is never replaced by a stale legacy continue save', () => {
  const storage = storageFixture({[SAVE_KEY]:defaults,[storyKey]:oldStory()});
  assert.equal(loadSave(storage, defaults).progress,null);
});

test('migration runs once and never resurrects a completed imported story', () => {
  const storage = storageFixture({[storyKey]:oldStory(),[galleryKey]:{artworks:['artwork/artwork01.webp']}});
  const saved = loadSave(storage, defaults);
  saved.progress=null; saved.artworks.push(8); storage.setItem(SAVE_KEY,JSON.stringify(saved));
  storage.data.set(galleryKey,JSON.stringify({artworks:['artwork/artwork02.webp']}));
  const before=storage.writes.length;
  const reloaded=loadSave(storage, defaults);
  assert.equal(reloaded.progress,null); assert.deepEqual(reloaded.artworks,[1,8]);
  assert.equal(storage.writes.length,before);
});

test('corrupt legacy categories do not prevent valid independent data from migrating', () => {
  const storage=storageFixture({[storyKey]:oldStory(),[tutorialKey]:{version:1,completed:true}});
  storage.data.set(galleryKey,'{broken'); storage.data.set(SAVE_KEY,'[1,2]');
  const saved=loadSave(storage,defaults);
  assert.equal(saved.progress.player,'lily'); assert.equal(saved.tutorialSeen,true);
  assert.equal(storage.getItem(galleryKey),'{broken');
});

test('invalid legacy story and tutorial versions are ignored without deleting old saves', () => {
  for (const extra of [{version:2},{playerId:'unknown'},{difficulty:'__proto__'},{stageIndex:-1},{stageIndex:4},{stageIndex:1.5},
    {phase:'invalid'},{phase:'opening',openingSceneIndex:4},{phase:'opening',openingSceneIndex:'1'},
    {phase:'ending',endingSceneNumber:0},{phase:'ending',endingSceneNumber:'2'}]) {
    const storage=storageFixture({[storyKey]:oldStory(extra),[tutorialKey]:{version:2,completed:true}});
    const saved=loadSave(storage,defaults);
    assert.equal(saved.progress,null); assert.equal(saved.tutorialSeen,false);
    assert.equal(storage.writes.length,0); assert.notEqual(storage.getItem(storyKey),null);
  }
});

test('storage access or quota failures do not block play or destroy legacy data', () => {
  assert.deepEqual(loadSave(null,defaults),defaults);
  assert.deepEqual(loadSave({getItem(){throw Error('denied');}},defaults),defaults);
  const storage=storageFixture({[storyKey]:oldStory()});
  const before=storage.getItem(storyKey);
  const successfulWriter=storage.setItem;
  storage.setItem=()=>{throw Error('quota');};
  assert.equal(loadSave(storage,defaults).progress.player,'lily');
  assert.equal(storage.getItem(SAVE_KEY),null); assert.equal(storage.getItem(storyKey),before);
  storage.setItem=successfulWriter;
  assert.equal(loadSave(storage,defaults).legacyImported,true);
  assert.notEqual(storage.getItem(SAVE_KEY),null);
});
