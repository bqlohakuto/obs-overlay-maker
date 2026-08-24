const test = require('node:test');
const assert = require('node:assert/strict');
const { initialState, cloneState, normalizeState, buildObsHtml } = require('../app.js');

test('初期状態と複製は独立している', () => {
  const state = initialState(), copy = cloneState(state);
  copy.panels.push({ id: 'panel-1', x: 10, y: 20 });
  assert.equal(state.panels.length, 0); assert.equal(copy.gameImageOpacity, 35);
});
test('保存データを安全なキャンバス範囲へ正規化する', () => {
  const state = normalizeState({ panels: [{ id: 'p', x: -20, y: 5000 }], gameImageOpacity: 150 });
  assert.deepEqual(state.panels[0], { id: 'p', x: 0, y: 960 }); assert.equal(state.gameImageOpacity, 100);
});
test('OBS用HTMLはパネルを出力し参照画像を含めない', () => {
  const html = buildObsHtml({ panels: [{ id: 'panel-1', x: 120, y: 240 }], gameImage: 'data:image/png;base64,secret', gameImageName: 'game.png' });
  assert.match(html, /data-panel-id="panel-1"/); assert.match(html, /left:120px;top:240px/);
  assert.doesNotMatch(html, /base64,secret|game\.png|game-reference/); assert.match(html, /background:transparent/);
});
test('OBS用HTMLは属性値をエスケープする', () => {
  const html = buildObsHtml({ panels: [{ id: '\"><script>', x: 0, y: 0 }] });
  assert.doesNotMatch(html, /<script>/); assert.match(html, /&quot;&gt;&lt;script&gt;/);
});
