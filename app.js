(function (root) {
  const STORAGE_KEY = 'obs-overlay-maker-state-v1';
  const WIDTH = 1920, HEIGHT = 1080, PANEL_W = 320, PANEL_H = 120;
  const PANEL_DEFAULTS = { width: PANEL_W, height: PANEL_H, borderColor: '#65e6ff', backgroundColor: '#142a42', borderOpacity: 100, backgroundOpacity: 90, borderStyle: 'solid', cornerTopLeft: true, cornerTopRight: true, cornerBottomLeft: true, cornerBottomRight: true };
  const TEXT_FONTS = ['system-ui', "'Yu Gothic', 'YuGothic', sans-serif", 'Meiryo, sans-serif', 'Arial, sans-serif', 'Georgia, serif', 'Impact, sans-serif', 'monospace'];
  const initialState = () => ({ panels: [], texts: [], gameImage: null, gameImageName: '', gameImageOpacity: 35 });
  const cloneState = (state) => JSON.parse(JSON.stringify(state));

  function normalizeState(value) {
    const state = initialState();
    if (!value || typeof value !== 'object') return state;
    if (Array.isArray(value.panels)) state.panels = value.panels
      .filter((panel) => panel && Number.isFinite(panel.x) && Number.isFinite(panel.y))
      .map((panel, index) => ({
        id: typeof panel.id === 'string' ? panel.id : `panel-${index + 1}`,
        width: Math.max(80, Math.min(WIDTH, Number(panel.width) || PANEL_W)),
        height: Math.max(50, Math.min(HEIGHT, Number(panel.height) || PANEL_H)),
        x: Math.max(0, Math.min(WIDTH - Math.max(80, Math.min(WIDTH, Number(panel.width) || PANEL_W)), panel.x)),
        y: Math.max(0, Math.min(HEIGHT - Math.max(50, Math.min(HEIGHT, Number(panel.height) || PANEL_H)), panel.y)),
        borderColor: /^#[0-9a-f]{6}$/i.test(panel.borderColor) ? panel.borderColor.toLowerCase() : PANEL_DEFAULTS.borderColor,
        backgroundColor: /^#[0-9a-f]{6}$/i.test(panel.backgroundColor) ? panel.backgroundColor.toLowerCase() : PANEL_DEFAULTS.backgroundColor,
        borderOpacity: Math.max(0, Math.min(100, Number.isFinite(Number(panel.borderOpacity)) ? Number(panel.borderOpacity) : (Number.isFinite(Number(panel.opacity)) ? Number(panel.opacity) : PANEL_DEFAULTS.borderOpacity))),
        backgroundOpacity: Math.max(0, Math.min(100, Number.isFinite(Number(panel.backgroundOpacity)) ? Number(panel.backgroundOpacity) : (Number.isFinite(Number(panel.opacity)) ? Number(panel.opacity) : PANEL_DEFAULTS.backgroundOpacity))),
        borderStyle: ['solid', 'dotted', 'double', 'dashed'].includes(panel.borderStyle) ? panel.borderStyle : PANEL_DEFAULTS.borderStyle,
        cornerTopLeft: typeof panel.cornerTopLeft === 'boolean' ? panel.cornerTopLeft : (typeof panel.diagonalCorners === 'boolean' ? panel.diagonalCorners : true),
        cornerTopRight: typeof panel.cornerTopRight === 'boolean' ? panel.cornerTopRight : (typeof panel.diagonalCorners === 'boolean' ? panel.diagonalCorners : true),
        cornerBottomLeft: typeof panel.cornerBottomLeft === 'boolean' ? panel.cornerBottomLeft : (typeof panel.diagonalCorners === 'boolean' ? panel.diagonalCorners : true),
        cornerBottomRight: typeof panel.cornerBottomRight === 'boolean' ? panel.cornerBottomRight : (typeof panel.diagonalCorners === 'boolean' ? panel.diagonalCorners : true)
      }));
    if (Array.isArray(value.texts)) state.texts = value.texts
      .filter((text) => text && Number.isFinite(text.x) && Number.isFinite(text.y))
      .map((text, index) => ({
        id: typeof text.id === 'string' ? text.id : `text-${index + 1}`,
        x: Math.max(0, Math.min(WIDTH - 80, text.x)), y: Math.max(0, Math.min(HEIGHT - 20, text.y)),
        content: typeof text.content === 'string' ? text.content.slice(0, 1000) : '新しい文字',
        fontFamily: TEXT_FONTS.includes(text.fontFamily) ? text.fontFamily : 'system-ui',
        fontSize: Math.max(8, Math.min(300, Number(text.fontSize) || 48)),
        color: /^#[0-9a-f]{6}$/i.test(text.color) ? text.color.toLowerCase() : '#ffffff',
        opacity: Math.max(0, Math.min(100, Number.isFinite(Number(text.opacity)) ? Number(text.opacity) : 100)),
        bold: Boolean(text.bold), align: ['left', 'center', 'right'].includes(text.align) ? text.align : 'left'
      }));
    state.gameImage = typeof value.gameImage === 'string' ? value.gameImage : null;
    state.gameImageName = typeof value.gameImageName === 'string' ? value.gameImageName : '';
    state.gameImageOpacity = Math.max(0, Math.min(100, Number(value.gameImageOpacity) || 0));
    return state;
  }

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const rgba = (hex, opacity) => `${hex}${Math.round(opacity * 2.55).toString(16).padStart(2, '0')}`;
  function panelClipPath(panel) {
    const tl = panel.cornerTopLeft, tr = panel.cornerTopRight, bl = panel.cornerBottomLeft, br = panel.cornerBottomRight;
    return `polygon(${tl ? '18px 0,0 18px' : '0 0'},${bl ? '0 calc(100% - 18px),18px 100%' : '0 100%'},${br ? 'calc(100% - 18px) 100%,100% calc(100% - 18px)' : '100% 100%'},${tr ? '100% 18px,calc(100% - 18px) 0' : '100% 0'})`;
  }

  function buildObsHtml(state) {
    const normalized = normalizeState(state);
    const panels = normalized.panels.map((panel) =>
      `    <div class="overlay-panel" data-panel-id="${escapeHtml(panel.id)}" style="left:${panel.x}px;top:${panel.y}px;width:${panel.width}px;height:${panel.height}px;border-color:${rgba(panel.borderColor, panel.borderOpacity)};border-style:${panel.borderStyle};border-width:${panel.borderStyle === 'double' ? 4 : 2}px;background-color:${rgba(panel.backgroundColor, panel.backgroundOpacity)};clip-path:${panelClipPath(panel)}"></div>`
    ).join('\n');
    const texts = normalized.texts.map((text) =>
      `    <div class="overlay-text" data-text-id="${escapeHtml(text.id)}" style="left:${text.x}px;top:${text.y}px;font-family:${escapeHtml(text.fontFamily)};font-size:${text.fontSize}px;color:${rgba(text.color, text.opacity)};font-weight:${text.bold ? 700 : 400};text-align:${text.align}">${escapeHtml(text.content)}</div>`
    ).join('\n');
    return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=1920, initial-scale=1">
  <title>OBS Overlay</title>
  <style>
    html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:transparent}
    .overlay{position:relative;width:1920px;height:1080px}
    .overlay-panel{position:absolute;width:320px;height:120px;border-width:2px;border-style:solid;box-sizing:border-box}
    .overlay-text{position:absolute;min-width:80px;max-width:1920px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.2}
  </style>
</head>
<body>
  <div class="overlay">
${panels}
${texts}
  </div>
</body>
</html>`;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { initialState, cloneState, normalizeState, buildObsHtml };
  if (!root.document) return;
  const document = root.document;
  const byId = (id) => document.getElementById(id);
  const canvas = byId('overlayCanvas'), addPanelBtn = byId('addPanelBtn'), addTextBtn = byId('addTextBtn');
  const undoBtn = byId('undoBtn'), redoBtn = byId('redoBtn'), saveBtn = byId('saveBtn');
  const loadBtn = byId('loadBtn'), exportBtn = byId('exportBtn'), editorMessage = byId('editorMessage');
  const gameImageInput = byId('gameImageInput'), gameReferenceImage = byId('gameReferenceImage');
  const gameImageName = byId('gameImageName'), gameImageOpacity = byId('gameImageOpacity');
  const gameImageOpacityValue = byId('gameImageOpacityValue'), removeGameImageBtn = byId('removeGameImageBtn');
  const gameImageMessage = byId('gameImageMessage');
  const panelSelectionMessage = byId('panelSelectionMessage'), panelBorderColor = byId('panelBorderColor');
  const panelBackgroundColor = byId('panelBackgroundColor'), panelBorderOpacity = byId('panelBorderOpacity');
  const panelBorderOpacityValue = byId('panelBorderOpacityValue'), panelBackgroundOpacity = byId('panelBackgroundOpacity');
  const panelBackgroundOpacityValue = byId('panelBackgroundOpacityValue'), panelBorderStyle = byId('panelBorderStyle');
  const panelCornerTopLeft = byId('panelCornerTopLeft'), panelCornerTopRight = byId('panelCornerTopRight');
  const panelCornerBottomLeft = byId('panelCornerBottomLeft'), panelCornerBottomRight = byId('panelCornerBottomRight');
  const panelWidth = byId('panelWidth'), panelHeight = byId('panelHeight');
  const panelInputs = [panelBorderColor, panelBackgroundColor, panelBorderOpacity, panelBackgroundOpacity, panelBorderStyle, panelCornerTopLeft, panelCornerTopRight, panelCornerBottomLeft, panelCornerBottomRight, panelWidth, panelHeight];
  const textSelectionMessage = byId('textSelectionMessage'), textContent = byId('textContent');
  const textFontFamily = byId('textFontFamily'), textFontSize = byId('textFontSize'), textColor = byId('textColor');
  const textOpacity = byId('textOpacity'), textOpacityValue = byId('textOpacityValue'), textBold = byId('textBold'), textAlign = byId('textAlign');
  const textInputs = [textContent, textFontFamily, textFontSize, textColor, textOpacity, textBold, textAlign];
  let state = initialState(), past = [], future = [], selectedPanelId = null, selectedTextId = null;

  const updateHistoryButtons = () => { undoBtn.disabled = !past.length; redoBtn.disabled = !future.length; };
  function commit(nextState) { past.push(cloneState(state)); state = normalizeState(nextState); future = []; render(); }
  function render() {
    canvas.querySelectorAll('.overlay-panel').forEach((panel) => panel.remove());
    canvas.querySelectorAll('.overlay-text').forEach((text) => text.remove());
    const scale = canvas.clientWidth / WIDTH;
    state.panels.forEach((data) => {
      const panel = document.createElement('div');
      panel.className = 'overlay-panel'; panel.dataset.panelId = data.id;
      panel.style.left = `${data.x * scale}px`; panel.style.top = `${data.y * scale}px`;
      panel.style.width = `${data.width * scale}px`; panel.style.height = `${data.height * scale}px`;
      panel.style.borderColor = rgba(data.borderColor, data.borderOpacity); panel.style.borderStyle = data.borderStyle;
      panel.style.borderWidth = `${data.borderStyle === 'double' ? 4 : 2}px`;
      panel.style.backgroundColor = rgba(data.backgroundColor, data.backgroundOpacity);
      panel.style.clipPath = panelClipPath(data);
      enableDragging(panel); canvas.appendChild(panel);
    });
    state.texts.forEach((data) => {
      const text = document.createElement('div'); text.className = 'overlay-text'; text.dataset.textId = data.id;
      text.textContent = data.content; text.style.left = `${data.x * scale}px`; text.style.top = `${data.y * scale}px`;
      text.style.minWidth = `${80 * scale}px`; text.style.fontFamily = data.fontFamily; text.style.fontSize = `${data.fontSize * scale}px`;
      text.style.color = rgba(data.color, data.opacity); text.style.fontWeight = data.bold ? '700' : '400'; text.style.textAlign = data.align;
      enableTextDragging(text); canvas.appendChild(text);
    });
    if (state.gameImage) gameReferenceImage.src = state.gameImage; else gameReferenceImage.removeAttribute('src');
    gameReferenceImage.hidden = !state.gameImage;
    gameReferenceImage.style.opacity = String(state.gameImageOpacity / 100);
    gameImageName.textContent = state.gameImageName || '画像は選択されていません';
    gameImageOpacity.value = String(state.gameImageOpacity);
    gameImageOpacityValue.value = `${state.gameImageOpacity}%`; gameImageOpacityValue.textContent = `${state.gameImageOpacity}%`;
    removeGameImageBtn.disabled = !state.gameImage; updatePanelControls(); updateTextControls(); updateHistoryButtons();
  }

  function updatePanelControls() {
    const panel = state.panels.find((item) => item.id === selectedPanelId);
    panelInputs.forEach((input) => { input.disabled = !panel; });
    panelSelectionMessage.textContent = panel ? `${panel.id} を編集中` : '編集するパネルを選択してください';
    if (!panel) return;
    panelBorderColor.value = panel.borderColor; panelBackgroundColor.value = panel.backgroundColor;
    panelBorderOpacity.value = String(panel.borderOpacity); panelBorderOpacityValue.value = `${panel.borderOpacity}%`; panelBorderOpacityValue.textContent = `${panel.borderOpacity}%`;
    panelBackgroundOpacity.value = String(panel.backgroundOpacity); panelBackgroundOpacityValue.value = `${panel.backgroundOpacity}%`; panelBackgroundOpacityValue.textContent = `${panel.backgroundOpacity}%`;
    panelBorderStyle.value = panel.borderStyle;
    panelCornerTopLeft.checked = panel.cornerTopLeft; panelCornerTopRight.checked = panel.cornerTopRight;
    panelCornerBottomLeft.checked = panel.cornerBottomLeft; panelCornerBottomRight.checked = panel.cornerBottomRight;
    panelWidth.value = String(panel.width); panelHeight.value = String(panel.height);
  }

  function editSelectedPanel(changes) {
    const panel = state.panels.find((item) => item.id === selectedPanelId); if (!panel) return;
    const next = cloneState(state), target = next.panels.find((item) => item.id === selectedPanelId);
    Object.assign(target, changes); commit(next);
  }
  function updateTextControls() {
    const text = state.texts.find((item) => item.id === selectedTextId);
    textInputs.forEach((input) => { input.disabled = !text; });
    textSelectionMessage.textContent = text ? `${text.id} を編集中` : '編集する文字を選択してください';
    if (!text) return;
    textContent.value = text.content; textFontFamily.value = text.fontFamily; textFontSize.value = String(text.fontSize); textColor.value = text.color;
    textOpacity.value = String(text.opacity); textOpacityValue.value = `${text.opacity}%`; textOpacityValue.textContent = `${text.opacity}%`;
    textBold.checked = text.bold; textAlign.value = text.align;
  }
  function editSelectedText(changes) {
    const text = state.texts.find((item) => item.id === selectedTextId); if (!text) return;
    const next = cloneState(state), target = next.texts.find((item) => item.id === selectedTextId); Object.assign(target, changes); commit(next);
  }

  addPanelBtn.addEventListener('click', () => {
    const next = cloneState(state);
    const number = next.panels.reduce((max, panel) => Math.max(max, Number(panel.id.replace('panel-', '')) || 0), 0) + 1;
    const id = `panel-${number}`;
    next.panels.push({ id, x: 40 + number * 16, y: 40 + number * 16, ...PANEL_DEFAULTS }); selectedPanelId = id; commit(next);
  });
  addTextBtn.addEventListener('click', () => {
    const next = cloneState(state), number = next.texts.reduce((max, text) => Math.max(max, Number(text.id.replace('text-', '')) || 0), 0) + 1;
    const id = `text-${number}`; next.texts.push({ id, x: 80 + number * 16, y: 80 + number * 16, content: '新しい文字', fontFamily: 'system-ui', fontSize: 48, color: '#ffffff', opacity: 100, bold: false, align: 'left' });
    selectedTextId = id; commit(next);
  });
  panelBorderColor.addEventListener('input', () => editSelectedPanel({ borderColor: panelBorderColor.value }));
  panelBackgroundColor.addEventListener('input', () => editSelectedPanel({ backgroundColor: panelBackgroundColor.value }));
  panelBorderOpacity.addEventListener('input', () => { panelBorderOpacityValue.value = `${panelBorderOpacity.value}%`; panelBorderOpacityValue.textContent = `${panelBorderOpacity.value}%`; });
  panelBorderOpacity.addEventListener('change', () => editSelectedPanel({ borderOpacity: Number(panelBorderOpacity.value) }));
  panelBackgroundOpacity.addEventListener('input', () => { panelBackgroundOpacityValue.value = `${panelBackgroundOpacity.value}%`; panelBackgroundOpacityValue.textContent = `${panelBackgroundOpacity.value}%`; });
  panelBackgroundOpacity.addEventListener('change', () => editSelectedPanel({ backgroundOpacity: Number(panelBackgroundOpacity.value) }));
  panelBorderStyle.addEventListener('change', () => editSelectedPanel({ borderStyle: panelBorderStyle.value }));
  panelCornerTopLeft.addEventListener('change', () => editSelectedPanel({ cornerTopLeft: panelCornerTopLeft.checked }));
  panelCornerTopRight.addEventListener('change', () => editSelectedPanel({ cornerTopRight: panelCornerTopRight.checked }));
  panelCornerBottomLeft.addEventListener('change', () => editSelectedPanel({ cornerBottomLeft: panelCornerBottomLeft.checked }));
  panelCornerBottomRight.addEventListener('change', () => editSelectedPanel({ cornerBottomRight: panelCornerBottomRight.checked }));
  panelWidth.addEventListener('change', () => editSelectedPanel({ width: Number(panelWidth.value) }));
  panelHeight.addEventListener('change', () => editSelectedPanel({ height: Number(panelHeight.value) }));
  textContent.addEventListener('input', () => editSelectedText({ content: textContent.value }));
  textFontFamily.addEventListener('change', () => editSelectedText({ fontFamily: textFontFamily.value }));
  textFontSize.addEventListener('change', () => editSelectedText({ fontSize: Number(textFontSize.value) }));
  textColor.addEventListener('input', () => editSelectedText({ color: textColor.value }));
  textOpacity.addEventListener('input', () => { textOpacityValue.value = `${textOpacity.value}%`; textOpacityValue.textContent = `${textOpacity.value}%`; });
  textOpacity.addEventListener('change', () => editSelectedText({ opacity: Number(textOpacity.value) }));
  textBold.addEventListener('change', () => editSelectedText({ bold: textBold.checked }));
  textAlign.addEventListener('change', () => editSelectedText({ align: textAlign.value }));
  undoBtn.addEventListener('click', () => { if (past.length) { future.push(cloneState(state)); state = past.pop(); render(); } });
  redoBtn.addEventListener('click', () => { if (future.length) { past.push(cloneState(state)); state = future.pop(); render(); } });

  gameImageInput.addEventListener('change', () => {
    const [file] = gameImageInput.files; gameImageMessage.textContent = ''; if (!file) return;
    if (!file.type.startsWith('image/')) { gameImageInput.value = ''; gameImageMessage.textContent = '画像ファイルを選択してください。'; return; }
    const reader = new FileReader();
    reader.addEventListener('load', () => { const next = cloneState(state); next.gameImage = reader.result; next.gameImageName = file.name; commit(next); });
    reader.addEventListener('error', () => { gameImageMessage.textContent = '画像を読み込めませんでした。'; }); reader.readAsDataURL(file);
  });
  gameImageOpacity.addEventListener('input', () => {
    gameReferenceImage.style.opacity = String(Number(gameImageOpacity.value) / 100);
    gameImageOpacityValue.value = `${gameImageOpacity.value}%`; gameImageOpacityValue.textContent = `${gameImageOpacity.value}%`;
  });
  gameImageOpacity.addEventListener('change', () => { const next = cloneState(state); next.gameImageOpacity = Number(gameImageOpacity.value); commit(next); });
  removeGameImageBtn.addEventListener('click', () => {
    const next = cloneState(state); next.gameImage = null; next.gameImageName = ''; gameImageInput.value = ''; gameImageMessage.textContent = ''; commit(next);
  });

  saveBtn.addEventListener('click', () => {
    try { root.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); editorMessage.textContent = 'ブラウザに保存しました。'; }
    catch (error) { editorMessage.textContent = '保存できませんでした。画像サイズが大きすぎる可能性があります。'; }
  });
  loadBtn.addEventListener('click', () => {
    try {
      const saved = root.localStorage.getItem(STORAGE_KEY);
      if (!saved) { editorMessage.textContent = '保存データがありません。'; return; }
      commit(JSON.parse(saved)); editorMessage.textContent = '保存データを読み込みました。';
    } catch (error) { editorMessage.textContent = '保存データを読み込めませんでした。'; }
  });
  exportBtn.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([buildObsHtml(state)], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'obs-overlay.html'; link.click(); URL.revokeObjectURL(url);
    editorMessage.textContent = 'OBS用HTMLを書き出しました。';
  });

  function enableDragging(element) {
    let start = null;
    element.addEventListener('pointerdown', (event) => {
      const panel = state.panels.find((item) => item.id === element.dataset.panelId);
      selectedPanelId = panel.id;
      updatePanelControls();
      start = { pointerX: event.clientX, pointerY: event.clientY, x: panel.x, y: panel.y, before: cloneState(state) };
      element.setPointerCapture(event.pointerId);
    });
    element.addEventListener('pointermove', (event) => {
      if (!start) return; const scale = canvas.clientWidth / WIDTH || 1;
      const panel = state.panels.find((item) => item.id === element.dataset.panelId);
      panel.x = Math.max(0, Math.min(WIDTH - panel.width, start.x + (event.clientX - start.pointerX) / scale));
      panel.y = Math.max(0, Math.min(HEIGHT - panel.height, start.y + (event.clientY - start.pointerY) / scale));
      element.style.left = `${panel.x * scale}px`; element.style.top = `${panel.y * scale}px`;
    });
    const stop = (event) => {
      if (!start) return;
      if (JSON.stringify(start.before.panels) !== JSON.stringify(state.panels)) { past.push(start.before); future = []; updateHistoryButtons(); }
      start = null; if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    element.addEventListener('pointerup', stop); element.addEventListener('pointercancel', stop);
  }
  function enableTextDragging(element) {
    let start = null;
    element.addEventListener('pointerdown', (event) => {
      const text = state.texts.find((item) => item.id === element.dataset.textId); selectedTextId = text.id; updateTextControls();
      start = { pointerX: event.clientX, pointerY: event.clientY, x: text.x, y: text.y, before: cloneState(state) }; element.setPointerCapture(event.pointerId);
    });
    element.addEventListener('pointermove', (event) => {
      if (!start) return; const scale = canvas.clientWidth / WIDTH || 1, text = state.texts.find((item) => item.id === element.dataset.textId);
      const width = element.offsetWidth / scale, height = element.offsetHeight / scale;
      text.x = Math.max(0, Math.min(WIDTH - width, start.x + (event.clientX - start.pointerX) / scale));
      text.y = Math.max(0, Math.min(HEIGHT - height, start.y + (event.clientY - start.pointerY) / scale));
      element.style.left = `${text.x * scale}px`; element.style.top = `${text.y * scale}px`;
    });
    const stop = (event) => {
      if (!start) return; if (JSON.stringify(start.before.texts) !== JSON.stringify(state.texts)) { past.push(start.before); future = []; updateHistoryButtons(); }
      start = null; if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    element.addEventListener('pointerup', stop); element.addEventListener('pointercancel', stop);
  }
  root.addEventListener('resize', render); render();
})(typeof window !== 'undefined' ? window : globalThis);
