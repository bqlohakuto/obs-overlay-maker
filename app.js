(function (root) {
  const STORAGE_KEY = 'obs-overlay-maker-state-v1';
  const PUBLIC_ASSET_BASE = 'https://bqlohakuto.github.io/obs-overlay-maker/';
  const WIDTH = 1920, HEIGHT = 1080, PANEL_W = 320, PANEL_H = 120;
  const PANEL_DEFAULTS = { width: PANEL_W, height: PANEL_H, borderColor: '#65e6ff', backgroundColor: '#142a42', borderOpacity: 100, backgroundOpacity: 90, borderStyle: 'solid', cornerTopLeft: true, cornerTopRight: true, cornerBottomLeft: true, cornerBottomRight: true };
  const TEXT_FONTS = ['system-ui', "'Yu Gothic', 'YuGothic', sans-serif", 'Meiryo, sans-serif', 'Arial, sans-serif', 'Georgia, serif', 'Impact, sans-serif', 'monospace'];
  const SHAPE_TYPES = ['star', 'heart', 'diamond', 'circle', 'triangle'];
  const FRAME_IMAGES = ['cyan', 'japanese-rabbit', 'cyberpunk', 'chinese', 'gothic-rose', 'fantasy', 'japanese-rabbit-red-white', 'steampunk', 'botanical', 'light'].flatMap((name) => [`assets/panel-frame-${name}.png`, `assets/panel-frame-${name}-simple.png`]);
  const initialState = () => ({ panels: [], texts: [], shapes: [], gameImage: null, gameImageName: '', gameImageOpacity: 35 });
  const cloneState = (state) => JSON.parse(JSON.stringify(state));
  function removePanel(state, panelId) {
    const next = cloneState(state); next.panels = next.panels.filter((panel) => panel.id !== panelId); return next;
  }

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
        cornerBottomRight: typeof panel.cornerBottomRight === 'boolean' ? panel.cornerBottomRight : (typeof panel.diagonalCorners === 'boolean' ? panel.diagonalCorners : true),
        frameImage: FRAME_IMAGES.includes(panel.frameImage) ? panel.frameImage : '',
        frameHue: Math.max(0, Math.min(360, Number(panel.frameHue) || 0)), frameSaturation: Math.max(0, Math.min(200, Number.isFinite(Number(panel.frameSaturation)) ? Number(panel.frameSaturation) : 100)),
        frameBrightness: Math.max(25, Math.min(175, Number.isFinite(Number(panel.frameBrightness)) ? Number(panel.frameBrightness) : 100))
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
    if (Array.isArray(value.shapes)) state.shapes = value.shapes.filter((shape) => shape && Number.isFinite(shape.x) && Number.isFinite(shape.y)).map((shape, index) => {
      const width = Math.max(20, Math.min(WIDTH, Number(shape.width) || 160)), height = Math.max(20, Math.min(HEIGHT, Number(shape.height) || 160));
      return { id: typeof shape.id === 'string' ? shape.id : `shape-${index + 1}`, x: Math.max(0, Math.min(WIDTH - width, shape.x)), y: Math.max(0, Math.min(HEIGHT - height, shape.y)), width, height,
        type: SHAPE_TYPES.includes(shape.type) ? shape.type : 'star', color: /^#[0-9a-f]{6}$/i.test(shape.color) ? shape.color.toLowerCase() : '#ff5d8f',
        opacity: Math.max(0, Math.min(100, Number.isFinite(Number(shape.opacity)) ? Number(shape.opacity) : 100)), rotation: Math.max(-360, Math.min(360, Number(shape.rotation) || 0)) };
    });
    state.gameImage = typeof value.gameImage === 'string' ? value.gameImage : null;
    state.gameImageName = typeof value.gameImageName === 'string' ? value.gameImageName : '';
    state.gameImageOpacity = Math.max(0, Math.min(100, Number(value.gameImageOpacity) || 0));
    return state;
  }

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const rgba = (hex, opacity) => `${hex}${Math.round((opacity / 100) * 255).toString(16).padStart(2, '0')}`;
  function panelClipPath(panel) {
    const tl = panel.cornerTopLeft, tr = panel.cornerTopRight, bl = panel.cornerBottomLeft, br = panel.cornerBottomRight;
    return `polygon(${tl ? '18px 0,0 18px' : '0 0'},${bl ? '0 calc(100% - 18px),18px 100%' : '0 100%'},${br ? 'calc(100% - 18px) 100%,100% calc(100% - 18px)' : '100% 100%'},${tr ? '100% 18px,calc(100% - 18px) 0' : '100% 0'})`;
  }
  const shapeClipPath = (type) => ({ star: 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 100%,50% 74%,21% 100%,32% 57%,2% 35%,39% 35%)', heart: 'polygon(50% 92%,8% 52%,2% 30%,8% 12%,25% 3%,42% 8%,50% 22%,58% 8%,75% 3%,92% 12%,98% 30%,92% 52%)', diamond: 'polygon(50% 0%,100% 50%,50% 100%,0% 50%)', circle: 'circle(50% at 50% 50%)', triangle: 'polygon(50% 0%,100% 100%,0% 100%)' })[type];

  function buildObsHtml(state, frameAssets = {}) {
    const normalized = normalizeState(state);
    const panels = normalized.panels.map((panel) =>
      `    <div class="overlay-panel" data-panel-id="${escapeHtml(panel.id)}" style="left:${panel.x}px;top:${panel.y}px;width:${panel.width}px;height:${panel.height}px;border-color:${panel.frameImage ? 'transparent' : rgba(panel.borderColor, panel.borderOpacity)};border-style:${panel.borderStyle};border-width:${panel.borderStyle === 'double' ? 4 : 2}px;background-color:${rgba(panel.backgroundColor, panel.backgroundOpacity)};clip-path:${panel.frameImage ? 'none' : panelClipPath(panel)}">${panel.frameImage ? `<img class="panel-frame-image" alt="" src="${escapeHtml(frameAssets[panel.frameImage] || panel.frameImage)}" style="filter:hue-rotate(${panel.frameHue}deg) saturate(${panel.frameSaturation}%) brightness(${panel.frameBrightness}%)">` : ''}</div>`
    ).join('\n');
    const texts = normalized.texts.map((text) =>
      `    <div class="overlay-text" data-text-id="${escapeHtml(text.id)}" style="left:${text.x}px;top:${text.y}px;font-family:${escapeHtml(text.fontFamily)};font-size:${text.fontSize}px;color:${rgba(text.color, text.opacity)};font-weight:${text.bold ? 700 : 400};text-align:${text.align}">${escapeHtml(text.content)}</div>`
    ).join('\n');
    const shapes = normalized.shapes.map((shape) => `    <div class="overlay-shape" data-shape-id="${escapeHtml(shape.id)}" style="left:${shape.x}px;top:${shape.y}px;width:${shape.width}px;height:${shape.height}px;background:${rgba(shape.color, shape.opacity)};clip-path:${shapeClipPath(shape.type)};transform:rotate(${shape.rotation}deg)"></div>`).join('\n');
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
    .panel-frame-image{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
    .overlay-text{position:absolute;min-width:80px;max-width:1920px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.2}
    .overlay-shape{position:absolute}
  </style>
</head>
<body>
  <div class="overlay">
${panels}
${texts}
${shapes}
  </div>
</body>
</html>`;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { initialState, cloneState, normalizeState, buildObsHtml, removePanel };
  if (!root.document) return;
  const document = root.document;
  const byId = (id) => document.getElementById(id);
  const canvas = byId('overlayCanvas'), addPanelBtn = byId('addPanelBtn'), addTextBtn = byId('addTextBtn'), addShapeBtn = byId('addShapeBtn');
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
  const deletePanelBtn = byId('deletePanelBtn');
  const panelFrameImage = byId('panelFrameImage'), panelFrameFilterControls = byId('panelFrameFilterControls');
  const panelFrameHue = byId('panelFrameHue'), panelFrameHueValue = byId('panelFrameHueValue'), panelFrameSaturation = byId('panelFrameSaturation'), panelFrameSaturationValue = byId('panelFrameSaturationValue');
  const panelFrameBrightness = byId('panelFrameBrightness'), panelFrameBrightnessValue = byId('panelFrameBrightnessValue');
  const panelInputs = [panelFrameImage, panelBorderColor, panelBackgroundColor, panelBorderOpacity, panelBackgroundOpacity, panelBorderStyle, panelCornerTopLeft, panelCornerTopRight, panelCornerBottomLeft, panelCornerBottomRight, panelWidth, panelHeight, panelFrameHue, panelFrameSaturation, panelFrameBrightness];
  const textSelectionMessage = byId('textSelectionMessage'), textContent = byId('textContent');
  const textFontFamily = byId('textFontFamily'), textFontSize = byId('textFontSize'), textColor = byId('textColor');
  const textOpacity = byId('textOpacity'), textOpacityValue = byId('textOpacityValue'), textBold = byId('textBold'), textAlign = byId('textAlign');
  const textInputs = [textContent, textFontFamily, textFontSize, textColor, textOpacity, textBold, textAlign];
  const shapeSelectionMessage = byId('shapeSelectionMessage'), shapeType = byId('shapeType'), shapeColor = byId('shapeColor');
  const shapeOpacity = byId('shapeOpacity'), shapeOpacityValue = byId('shapeOpacityValue'), shapeWidth = byId('shapeWidth'), shapeHeight = byId('shapeHeight');
  const shapeRotation = byId('shapeRotation'), deleteShapeBtn = byId('deleteShapeBtn'), shapeInputs = [shapeType, shapeColor, shapeOpacity, shapeWidth, shapeHeight, shapeRotation];
  let state = initialState(), past = [], future = [], selectedPanelId = null, selectedTextId = null, selectedShapeId = null;

  const updateHistoryButtons = () => { undoBtn.disabled = !past.length; redoBtn.disabled = !future.length; };
  function commit(nextState) { past.push(cloneState(state)); state = normalizeState(nextState); future = []; render(); }
  function render() {
    canvas.querySelectorAll('.overlay-panel').forEach((panel) => panel.remove());
    canvas.querySelectorAll('.overlay-text').forEach((text) => text.remove());
    canvas.querySelectorAll('.overlay-shape').forEach((shape) => shape.remove());
    const scale = canvas.clientWidth / WIDTH;
    state.panels.forEach((data) => {
      const panel = document.createElement('div');
      panel.className = 'overlay-panel'; panel.dataset.panelId = data.id;
      panel.style.left = `${data.x * scale}px`; panel.style.top = `${data.y * scale}px`;
      panel.style.width = `${data.width * scale}px`; panel.style.height = `${data.height * scale}px`;
      panel.style.borderColor = rgba(data.borderColor, data.borderOpacity); panel.style.borderStyle = data.borderStyle;
      panel.style.borderWidth = `${data.borderStyle === 'double' ? 4 : 2}px`;
      panel.style.backgroundColor = rgba(data.backgroundColor, data.backgroundOpacity);
      panel.style.clipPath = data.frameImage ? 'none' : panelClipPath(data); panel.style.borderColor = data.frameImage ? 'transparent' : rgba(data.borderColor, data.borderOpacity);
      if (data.frameImage) {
        const image = document.createElement('img'); image.className = 'panel-frame-image'; image.alt = ''; image.src = data.frameImage;
        image.style.filter = `hue-rotate(${data.frameHue}deg) saturate(${data.frameSaturation}%) brightness(${data.frameBrightness}%)`; panel.appendChild(image);
      }
      enableDragging(panel); canvas.appendChild(panel);
    });
    state.texts.forEach((data) => {
      const text = document.createElement('div'); text.className = 'overlay-text'; text.dataset.textId = data.id;
      text.textContent = data.content; text.style.left = `${data.x * scale}px`; text.style.top = `${data.y * scale}px`;
      text.style.minWidth = `${80 * scale}px`; text.style.fontFamily = data.fontFamily; text.style.fontSize = `${data.fontSize * scale}px`;
      text.style.color = rgba(data.color, data.opacity); text.style.fontWeight = data.bold ? '700' : '400'; text.style.textAlign = data.align;
      enableTextDragging(text); canvas.appendChild(text);
    });
    state.shapes.forEach((data) => {
      const shape = document.createElement('div'); shape.className = 'overlay-shape'; shape.dataset.shapeId = data.id;
      shape.style.left = `${data.x * scale}px`; shape.style.top = `${data.y * scale}px`; shape.style.width = `${data.width * scale}px`; shape.style.height = `${data.height * scale}px`;
      shape.style.background = rgba(data.color, data.opacity); shape.style.clipPath = shapeClipPath(data.type); shape.style.transform = `rotate(${data.rotation}deg)`;
      enableShapeDragging(shape); canvas.appendChild(shape);
    });
    if (state.gameImage) gameReferenceImage.src = state.gameImage; else gameReferenceImage.removeAttribute('src');
    gameReferenceImage.hidden = !state.gameImage;
    gameReferenceImage.style.opacity = String(state.gameImageOpacity / 100);
    gameImageName.textContent = state.gameImageName || '画像は選択されていません';
    gameImageOpacity.value = String(state.gameImageOpacity);
    gameImageOpacityValue.value = `${state.gameImageOpacity}%`; gameImageOpacityValue.textContent = `${state.gameImageOpacity}%`;
    removeGameImageBtn.disabled = !state.gameImage; updatePanelControls(); updateTextControls(); updateShapeControls(); updateHistoryButtons();
  }

  function updatePanelControls() {
    const panel = state.panels.find((item) => item.id === selectedPanelId);
    panelInputs.forEach((input) => { input.disabled = !panel; }); deletePanelBtn.disabled = !panel;
    panelSelectionMessage.textContent = panel ? `${panel.id} を編集中` : '編集するパネルを選択してください';
    if (!panel) return;
    panelBorderColor.value = panel.borderColor; panelBackgroundColor.value = panel.backgroundColor;
    panelBorderOpacity.value = String(panel.borderOpacity); panelBorderOpacityValue.value = `${panel.borderOpacity}%`; panelBorderOpacityValue.textContent = `${panel.borderOpacity}%`;
    panelBackgroundOpacity.value = String(panel.backgroundOpacity); panelBackgroundOpacityValue.value = `${panel.backgroundOpacity}%`; panelBackgroundOpacityValue.textContent = `${panel.backgroundOpacity}%`;
    panelBorderStyle.value = panel.borderStyle;
    panelFrameImage.value = panel.frameImage; panelFrameFilterControls.hidden = !panel.frameImage;
    panelFrameHue.value = String(panel.frameHue); panelFrameHueValue.value = `${panel.frameHue}°`; panelFrameHueValue.textContent = `${panel.frameHue}°`;
    panelFrameSaturation.value = String(panel.frameSaturation); panelFrameSaturationValue.value = `${panel.frameSaturation}%`; panelFrameSaturationValue.textContent = `${panel.frameSaturation}%`;
    panelFrameBrightness.value = String(panel.frameBrightness); panelFrameBrightnessValue.value = `${panel.frameBrightness}%`; panelFrameBrightnessValue.textContent = `${panel.frameBrightness}%`;
    [panelBorderColor, panelBorderOpacity, panelBorderStyle, panelCornerTopLeft, panelCornerTopRight, panelCornerBottomLeft, panelCornerBottomRight].forEach((input) => { input.disabled = Boolean(panel.frameImage); });
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
  function updateShapeControls() {
    const shape = state.shapes.find((item) => item.id === selectedShapeId); shapeInputs.forEach((input) => { input.disabled = !shape; }); deleteShapeBtn.disabled = !shape;
    shapeSelectionMessage.textContent = shape ? `${shape.id} を編集中` : '編集する図形を選択してください'; if (!shape) return;
    shapeType.value = shape.type; shapeColor.value = shape.color; shapeOpacity.value = String(shape.opacity); shapeOpacityValue.value = `${shape.opacity}%`; shapeOpacityValue.textContent = `${shape.opacity}%`;
    shapeWidth.value = String(shape.width); shapeHeight.value = String(shape.height); shapeRotation.value = String(shape.rotation);
  }
  function editSelectedShape(changes) { if (!selectedShapeId) return; const next = cloneState(state), target = next.shapes.find((item) => item.id === selectedShapeId); if (!target) return; Object.assign(target, changes); commit(next); }

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
  addShapeBtn.addEventListener('click', () => {
    const next = cloneState(state), number = next.shapes.reduce((max, shape) => Math.max(max, Number(shape.id.replace('shape-', '')) || 0), 0) + 1, id = `shape-${number}`;
    next.shapes.push({ id, x: 120 + number * 16, y: 120 + number * 16, width: 160, height: 160, type: 'star', color: '#ff5d8f', opacity: 100, rotation: 0 }); selectedShapeId = id; commit(next);
  });
  panelBorderColor.addEventListener('input', () => editSelectedPanel({ borderColor: panelBorderColor.value }));
  panelFrameImage.addEventListener('change', () => editSelectedPanel({ frameImage: panelFrameImage.value }));
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
  panelFrameHue.addEventListener('input', () => { panelFrameHueValue.value = `${panelFrameHue.value}°`; panelFrameHueValue.textContent = `${panelFrameHue.value}°`; });
  panelFrameHue.addEventListener('change', () => editSelectedPanel({ frameHue: Number(panelFrameHue.value) }));
  panelFrameSaturation.addEventListener('input', () => { panelFrameSaturationValue.value = `${panelFrameSaturation.value}%`; panelFrameSaturationValue.textContent = `${panelFrameSaturation.value}%`; });
  panelFrameSaturation.addEventListener('change', () => editSelectedPanel({ frameSaturation: Number(panelFrameSaturation.value) }));
  panelFrameBrightness.addEventListener('input', () => { panelFrameBrightnessValue.value = `${panelFrameBrightness.value}%`; panelFrameBrightnessValue.textContent = `${panelFrameBrightness.value}%`; });
  panelFrameBrightness.addEventListener('change', () => editSelectedPanel({ frameBrightness: Number(panelFrameBrightness.value) }));
  deletePanelBtn.addEventListener('click', () => {
    if (!selectedPanelId) return; const next = removePanel(state, selectedPanelId); selectedPanelId = null; commit(next);
    editorMessage.textContent = 'パネルを削除しました。';
  });
  textContent.addEventListener('input', () => editSelectedText({ content: textContent.value }));
  textFontFamily.addEventListener('change', () => editSelectedText({ fontFamily: textFontFamily.value }));
  textFontSize.addEventListener('change', () => editSelectedText({ fontSize: Number(textFontSize.value) }));
  textColor.addEventListener('input', () => editSelectedText({ color: textColor.value }));
  textOpacity.addEventListener('input', () => { textOpacityValue.value = `${textOpacity.value}%`; textOpacityValue.textContent = `${textOpacity.value}%`; });
  textOpacity.addEventListener('change', () => editSelectedText({ opacity: Number(textOpacity.value) }));
  textBold.addEventListener('change', () => editSelectedText({ bold: textBold.checked }));
  textAlign.addEventListener('change', () => editSelectedText({ align: textAlign.value }));
  shapeType.addEventListener('change', () => editSelectedShape({ type: shapeType.value }));
  shapeColor.addEventListener('input', () => editSelectedShape({ color: shapeColor.value }));
  shapeOpacity.addEventListener('input', () => { shapeOpacityValue.value = `${shapeOpacity.value}%`; shapeOpacityValue.textContent = `${shapeOpacity.value}%`; });
  shapeOpacity.addEventListener('change', () => editSelectedShape({ opacity: Number(shapeOpacity.value) }));
  shapeWidth.addEventListener('change', () => editSelectedShape({ width: Number(shapeWidth.value) })); shapeHeight.addEventListener('change', () => editSelectedShape({ height: Number(shapeHeight.value) }));
  shapeRotation.addEventListener('change', () => editSelectedShape({ rotation: Number(shapeRotation.value) }));
  deleteShapeBtn.addEventListener('click', () => { if (!selectedShapeId) return; const next = cloneState(state); next.shapes = next.shapes.filter((shape) => shape.id !== selectedShapeId); selectedShapeId = null; commit(next); editorMessage.textContent = '図形を削除しました。'; });
  undoBtn.addEventListener('click', () => { if (past.length) { future.push(cloneState(state)); state = past.pop(); render(); } });
  redoBtn.addEventListener('click', () => { if (future.length) { past.push(cloneState(state)); state = future.pop(); render(); } });

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.addEventListener('load', () => resolve(reader.result)); reader.addEventListener('error', reject); reader.readAsDataURL(file);
  });
  const prepareReferenceImage = async (file) => {
    if (file.size > 50 * 1024 * 1024) throw new Error('file-too-large');
    if (typeof createImageBitmap !== 'function') return fileToDataUrl(file);
    const bitmap = await createImageBitmap(file), scale = Math.min(1, WIDTH / bitmap.width, HEIGHT / bitmap.height);
    const output = document.createElement('canvas'); output.width = Math.max(1, Math.round(bitmap.width * scale)); output.height = Math.max(1, Math.round(bitmap.height * scale));
    output.getContext('2d').drawImage(bitmap, 0, 0, output.width, output.height); bitmap.close();
    const blob = await new Promise((resolve, reject) => output.toBlob((result) => result ? resolve(result) : reject(new Error('conversion-failed')), 'image/webp', .86));
    return fileToDataUrl(blob);
  };
  gameImageInput.addEventListener('change', async () => {
    const [file] = gameImageInput.files; gameImageMessage.textContent = ''; if (!file) return;
    if (!file.type.startsWith('image/')) { gameImageInput.value = ''; gameImageMessage.textContent = '画像ファイルを選択してください。'; return; }
    gameImageInput.disabled = true; gameImageMessage.textContent = '画像を軽量化しています…';
    try {
      const dataUrl = await prepareReferenceImage(file), next = cloneState(state); next.gameImage = dataUrl; next.gameImageName = file.name; commit(next); gameImageMessage.textContent = '';
    } catch (error) {
      gameImageInput.value = ''; gameImageMessage.textContent = error.message === 'file-too-large' ? '画像は50MB以下のものを選択してください。' : '画像を読み込めませんでした。別の画像をお試しください。';
    } finally { gameImageInput.disabled = false; }
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
  const imageElementToDataUrl = (image) => {
    const output = document.createElement('canvas'); output.width = image.naturalWidth; output.height = image.naturalHeight;
    output.getContext('2d').drawImage(image, 0, 0); return output.toDataURL('image/png');
  };
  const fetchAsDataUrl = async (url) => {
    const response = await fetch(url, { cache: 'force-cache' }); if (!response.ok) throw new Error(`HTTP ${response.status}`); const blob = await response.blob();
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.addEventListener('load', () => resolve(reader.result)); reader.addEventListener('error', reject); reader.readAsDataURL(blob); });
  };
  const frameToDataUrl = async (path) => {
    const visibleImage = [...canvas.querySelectorAll('.panel-frame-image')].find((image) => image.getAttribute('src') === path && image.complete && image.naturalWidth);
    if (visibleImage) { try { return imageElementToDataUrl(visibleImage); } catch (error) { /* 通信取得へフォールバック */ } }
    try {
      return await fetchAsDataUrl(new URL(path, document.baseURI));
    } catch (localFetchError) {
      try { return await fetchAsDataUrl(new URL(path, PUBLIC_ASSET_BASE)); } catch (publicFetchError) { /* 画像要素で最終試行 */ }
      const image = new Image(); image.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => { image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', reject, { once: true }); image.src = new URL(path, PUBLIC_ASSET_BASE).href; });
      return imageElementToDataUrl(image);
    }
  };
  exportBtn.addEventListener('click', async () => {
    exportBtn.disabled = true; editorMessage.textContent = 'OBS用HTMLを準備しています…';
    const paths = [...new Set(state.panels.map((panel) => panel.frameImage).filter(Boolean))], frameAssets = {};
    try { await Promise.all(paths.map(async (path) => { frameAssets[path] = await frameToDataUrl(path); })); }
    catch (error) { editorMessage.textContent = '画像枠の埋め込みに失敗しました。ページを再読み込みしてお試しください。'; exportBtn.disabled = false; return; }
    const url = URL.createObjectURL(new Blob([buildObsHtml(state, frameAssets)], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'obs-overlay.html'; link.click(); URL.revokeObjectURL(url);
    editorMessage.textContent = 'OBS用HTMLを書き出しました。'; exportBtn.disabled = false;
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
  function enableShapeDragging(element) {
    let start = null;
    element.addEventListener('pointerdown', (event) => {
      const shape = state.shapes.find((item) => item.id === element.dataset.shapeId); selectedShapeId = shape.id; updateShapeControls();
      start = { pointerX: event.clientX, pointerY: event.clientY, x: shape.x, y: shape.y, before: cloneState(state) }; element.setPointerCapture(event.pointerId);
    });
    element.addEventListener('pointermove', (event) => {
      if (!start) return; const scale = canvas.clientWidth / WIDTH || 1, shape = state.shapes.find((item) => item.id === element.dataset.shapeId);
      shape.x = Math.max(0, Math.min(WIDTH - shape.width, start.x + (event.clientX - start.pointerX) / scale)); shape.y = Math.max(0, Math.min(HEIGHT - shape.height, start.y + (event.clientY - start.pointerY) / scale));
      element.style.left = `${shape.x * scale}px`; element.style.top = `${shape.y * scale}px`;
    });
    const stop = (event) => {
      if (!start) return; if (JSON.stringify(start.before.shapes) !== JSON.stringify(state.shapes)) { past.push(start.before); future = []; updateHistoryButtons(); }
      start = null; if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    element.addEventListener('pointerup', stop); element.addEventListener('pointercancel', stop);
  }
  root.addEventListener('resize', render); render();
})(typeof window !== 'undefined' ? window : globalThis);
