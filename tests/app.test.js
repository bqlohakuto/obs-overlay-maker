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
  assert.equal(state.panels[0].x, 0); assert.equal(state.panels[0].y, 960);
  assert.equal(state.panels[0].width, 320); assert.equal(state.panels[0].height, 120);
  assert.equal(state.panels[0].borderOpacity, 100); assert.equal(state.panels[0].backgroundOpacity, 90);
  assert.equal(state.gameImageOpacity, 100);
});
test('OBS用HTMLはパネルを出力し参照画像を含めない', () => {
  const html = buildObsHtml({ panels: [{ id: 'panel-1', x: 120, y: 240 }], gameImage: 'data:image/png;base64,secret', gameImageName: 'game.png' });
  assert.match(html, /data-panel-id="panel-1"/); assert.match(html, /left:120px;top:240px/);
  assert.doesNotMatch(html, /base64,secret|game\.png|game-reference/); assert.match(html, /background:transparent/);
});
test('パネル編集値を正規化してOBS用HTMLへ反映する', () => {
  const panel = { id: 'custom', x: 1, y: 2, width: 500, height: 200, borderColor: '#FF0000', backgroundColor: '#00FF00', borderOpacity: 42, backgroundOpacity: 25, borderStyle: 'double', cornerTopLeft: true, cornerTopRight: false, cornerBottomLeft: false, cornerBottomRight: false };
  const state = normalizeState({ panels: [panel] });
  assert.equal(state.panels[0].borderColor, '#ff0000'); assert.equal(state.panels[0].borderOpacity, 42); assert.equal(state.panels[0].backgroundOpacity, 25);
  const html = buildObsHtml({ panels: [panel] });
  assert.match(html, /width:500px;height:200px/); assert.match(html, /border-color:#ff00006b/);
  assert.match(html, /border-style:double;border-width:4px/); assert.match(html, /background-color:#00ff0040/);
  assert.match(html, /clip-path:polygon\(18px 0,0 18px,0 100%,100% 100%,100% 0\)/);
});
test('旧パネル透明度と斜め設定を新しい個別設定へ移行する', () => {
  const panel = normalizeState({ panels: [{ id: 'old', x: 0, y: 0, opacity: 35, diagonalCorners: false }] }).panels[0];
  assert.equal(panel.borderOpacity, 35); assert.equal(panel.backgroundOpacity, 35);
  assert.equal(panel.cornerTopLeft, false); assert.equal(panel.cornerBottomRight, false);
});
test('OBS用HTMLは属性値をエスケープする', () => {
  const html = buildObsHtml({ panels: [{ id: '\"><script>', x: 0, y: 0 }] });
  assert.doesNotMatch(html, /<script>/); assert.match(html, /&quot;&gt;&lt;script&gt;/);
});
