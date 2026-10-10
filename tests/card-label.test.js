import test from 'node:test';
import assert from 'node:assert/strict';
import { classificationParts, classificationTerms, cardLabel } from '../src/card-label.js';
import { CARDS } from '../src/data.js';
const plain = html => html.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
test('all classification text and annotations survive formatting',()=>{
 for(const {subject} of CARDS){
  assert.equal(classificationTerms(subject).join(''),subject);
  assert.equal(plain(cardLabel(subject)),subject.replace('--',''),subject);
 }
});
test('hierarchical classes and colon explanations are separated from their main class',()=>{
 assert.deepEqual(classificationParts('北アメリカ史--アメリカ合衆国'),{main:'北アメリカ史',detail:'アメリカ合衆国'});
 assert.deepEqual(classificationParts('放送事業：テレビ，ラジオ'),{main:'放送事業：',detail:'テレビ，ラジオ'});
 assert.match(cardLabel('哲学--参考図書［レファレンス ブック］'),/subject-detail/);
 assert.match(cardLabel('論理学．弁証法［弁証法的論理学］．方法論'),/subject-note/);
});
test('short phrases stay whole, with longer phrases wrapping between words',()=>{
 assert.deepEqual(classificationTerms('図書館政策．図書館行財政'),['図書館政策．','図書館行財政']);
 assert.deepEqual(classificationTerms('資料の収集．資料の整理．資料の保管'),['資料の収集．','資料の整理．','資料の保管']);
 const terms=classificationTerms('貴重書．郷土資料．その他の特別コレクション');
 assert.ok(terms.includes('コレクション'));assert.ok(terms.every(t=>!/^[．。，、：:・］）＞】]/u.test(t)));
});
test('classification labels escape HTML rather than creating markup from text',()=>{
 const subject='分類--<img src="x">&注記';const html=cardLabel(subject);
 assert.equal(plain(html),subject.replace('--',''));assert.ok(!html.includes('<img'));
});
