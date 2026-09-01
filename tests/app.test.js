const test = require('node:test');
const assert = require('node:assert/strict');
const { initialState, cloneState, normalizeState, matchesKeyboardEvent, buildObsHtml, removePanel, fitCanvasSize } = require('../app.js');

test('初期状態と複製は独立している', () => {
  const state = initialState(), copy = cloneState(state);
  copy.panels.push({ id: 'panel-1', x: 10, y: 20 });
  assert.equal(state.panels.length, 0); assert.equal(copy.gameImageOpacity, 35);
});
test('ゲーム連動設定を正規化する', () => {
  const state = normalizeState({ gameLink: { enabled: false, code: 'KeyK', key: 'k', animation: 'shake' } });
  assert.deepEqual(state.gameLink, { enabled: false, code: 'KeyK', key: 'k', animation: 'shake' });
  assert.equal(normalizeState({ gameLink: { animation: 'unknown' } }).gameLink.animation, 'pulse');
});
test('設定キーの初回keydownだけをトリガーとして扱う', () => {
  const link = { enabled: true, code: 'KeyK', key: 'k' };
  assert.equal(matchesKeyboardEvent(link, { code: 'KeyK', repeat: false }), true);
  assert.equal(matchesKeyboardEvent(link, { code: '', key: 'K', repeat: false }), true);
  assert.equal(matchesKeyboardEvent(link, { code: '', key: 'j', repeat: false }), false);
  assert.equal(matchesKeyboardEvent(link, { code: 'KeyK', repeat: true }), false);
  assert.equal(matchesKeyboardEvent({ ...link, enabled: false }, { code: 'KeyK' }), false);
});
test('保存データを安全なキャンバス範囲へ正規化する', () => {
  const state = normalizeState({ panels: [{ id: 'p', x: -20, y: 5000 }], gameImageOpacity: 150 });
  assert.equal(state.panels[0].x, 0); assert.equal(state.panels[0].y, 960);
  assert.equal(state.panels[0].width, 320); assert.equal(state.panels[0].height, 120);
  assert.equal(state.panels[0].borderOpacity, 100); assert.equal(state.panels[0].backgroundOpacity, 90);
  assert.equal(state.gameImageOpacity, 100);
});
test('キャンバスを表示領域内の16対9サイズへ収める', () => {
  assert.deepEqual(fitCanvasSize(1200, 500), { width: 500 * 16 / 9, height: 500 });
  assert.deepEqual(fitCanvasSize(800, 1000), { width: 800, height: 450 });
  assert.deepEqual(fitCanvasSize(3000, 2000), { width: 1440, height: 810 });
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
test('文字の編集値を正規化してOBS用HTMLへ反映する', () => {
  const text = { id: 'text-1', x: 100, y: 200, content: '配信タイトル', fontFamily: "'Yu Gothic', 'YuGothic', sans-serif", fontSize: 72, color: '#ABCDEF', opacity: 80, bold: true, align: 'center' };
  const state = normalizeState({ texts: [text] });
  assert.equal(state.texts[0].color, '#abcdef'); assert.equal(state.texts[0].fontSize, 72); assert.equal(state.texts[0].bold, true);
  const html = buildObsHtml({ texts: [text] });
  assert.match(html, /data-text-id="text-1"/); assert.match(html, /font-size:72px/); assert.match(html, /color:#abcdefcc/);
  assert.match(html, /font-weight:700;text-align:center/); assert.match(html, />配信タイトル<\/div>/);
});
test('文字内容とIDをエスケープし未対応フォントを既定値へ戻す', () => {
  const state = normalizeState({ texts: [{ id: 'x', x: 0, y: 0, content: '<script>', fontFamily: 'unsafe-font' }] });
  assert.equal(state.texts[0].fontFamily, 'system-ui');
  const html = buildObsHtml({ texts: [{ id: '\"><b>', x: 0, y: 0, content: '<script>' }] });
  assert.doesNotMatch(html, /data-text-id="[^"]*<b>|class="overlay-text"[^>]*><script>/); assert.match(html, /&lt;script&gt;/);
});
test('選択したパネルだけを削除し他の要素を保持する', () => {
  const state = { panels: [{ id: 'panel-1' }, { id: 'panel-2' }], texts: [{ id: 'text-1' }] };
  const next = removePanel(state, 'panel-1');
  assert.deepEqual(next.panels, [{ id: 'panel-2' }]); assert.deepEqual(next.texts, state.texts);
  assert.equal(state.panels.length, 2);
});
test('図形の種類と編集値を正規化してOBS用HTMLへ反映する', () => {
  const shape = { id: 'shape-1', x: 20, y: 30, width: 240, height: 180, type: 'heart', color: '#FF0000', opacity: 50, rotation: 15 };
  const state = normalizeState({ shapes: [shape] }); assert.equal(state.shapes[0].type, 'heart'); assert.equal(state.shapes[0].color, '#ff0000');
  const html = buildObsHtml({ shapes: [shape] }); assert.match(html, /data-shape-id="shape-1"/); assert.match(html, /width:240px;height:180px/);
  assert.match(html, /background:#ff000080/); assert.match(html, /transform:rotate\(15deg\)/); assert.match(html, /clip-path:polygon\(50% 92%/);
});
test('未対応の図形と範囲外のサイズを安全な値へ戻す', () => {
  const shape = normalizeState({ shapes: [{ id: 'x', x: 9999, y: 9999, width: 9999, height: -1, type: 'unknown', opacity: 999 }] }).shapes[0];
  assert.equal(shape.type, 'star'); assert.equal(shape.width, 1920); assert.equal(shape.height, 20); assert.equal(shape.x, 0); assert.equal(shape.opacity, 100);
});
test('画像パネル枠と色調整を正規化してOBS用HTMLへ埋め込む', () => {
  const path = 'assets/panel-frame-cyberpunk-simple.png';
  const panel = { id: 'image-panel', x: 0, y: 0, frameImage: path, frameHue: 180, frameSaturation: 140, frameBrightness: 80 };
  const state = normalizeState({ panels: [panel] }); assert.equal(state.panels[0].frameImage, path); assert.equal(state.panels[0].frameHue, 180);
  const html = buildObsHtml({ panels: [panel] }, { [path]: 'data:image/png;base64,frame' });
  assert.match(html, /class="panel-frame-image"/); assert.match(html, /src="data:image\/png;base64,frame"/);
  assert.match(html, /hue-rotate\(180deg\) saturate\(140%\) brightness\(80%\)/); assert.match(html, /border-color:transparent/);
});
test('未登録のパネル枠画像を読み込まない', () => {
  const panel = normalizeState({ panels: [{ id: 'p', x: 0, y: 0, frameImage: 'javascript:alert(1)' }] }).panels[0];
  assert.equal(panel.frameImage, '');
});
test('OBS用HTMLへゲーム連動設定とイベント入口を含める', () => {
  const html = buildObsHtml({ panels: [], gameLink: { enabled: true, code: 'Space', key: ' ', animation: 'flash' } });
  assert.match(html, /"code":"Space"/); assert.match(html, /run-flash/); assert.match(html, /overlay\.trigger/);
});
test('OBS用HTMLは属性値をエスケープする', () => {
  const html = buildObsHtml({ panels: [{ id: '\"><script>', x: 0, y: 0 }] });
  assert.doesNotMatch(html, /data-panel-id="[^"]*<script>/); assert.match(html, /&quot;&gt;&lt;script&gt;/);
});
