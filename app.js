(function (root) {
  const STORAGE_KEY = 'obs-overlay-maker-state-v1';
  const WIDTH = 1920, HEIGHT = 1080, PANEL_W = 320, PANEL_H = 120;
  const initialState = () => ({ panels: [], gameImage: null, gameImageName: '', gameImageOpacity: 35 });
  const cloneState = (state) => JSON.parse(JSON.stringify(state));

  function normalizeState(value) {
    const state = initialState();
    if (!value || typeof value !== 'object') return state;
    if (Array.isArray(value.panels)) state.panels = value.panels
      .filter((panel) => panel && Number.isFinite(panel.x) && Number.isFinite(panel.y))
      .map((panel, index) => ({
        id: typeof panel.id === 'string' ? panel.id : `panel-${index + 1}`,
        x: Math.max(0, Math.min(WIDTH - PANEL_W, panel.x)),
        y: Math.max(0, Math.min(HEIGHT - PANEL_H, panel.y))
      }));
    state.gameImage = typeof value.gameImage === 'string' ? value.gameImage : null;
    state.gameImageName = typeof value.gameImageName === 'string' ? value.gameImageName : '';
    state.gameImageOpacity = Math.max(0, Math.min(100, Number(value.gameImageOpacity) || 0));
    return state;
  }

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  function buildObsHtml(state) {
    const panels = normalizeState(state).panels.map((panel) =>
      `    <div class="overlay-panel" data-panel-id="${escapeHtml(panel.id)}" style="left:${panel.x}px;top:${panel.y}px"></div>`
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
    .overlay-panel{position:absolute;width:320px;height:120px;border:2px solid #65e6ff;box-sizing:border-box;background:rgba(20,42,66,.9);clip-path:polygon(18px 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%,0 18px);box-shadow:0 0 20px rgba(101,230,255,.12)}
  </style>
</head>
<body>
  <div class="overlay">
${panels}
  </div>
</body>
</html>`;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { initialState, cloneState, normalizeState, buildObsHtml };
  if (!root.document) return;
  const document = root.document;
  const byId = (id) => document.getElementById(id);
  const canvas = byId('overlayCanvas'), addPanelBtn = byId('addPanelBtn');
  const undoBtn = byId('undoBtn'), redoBtn = byId('redoBtn'), saveBtn = byId('saveBtn');
  const loadBtn = byId('loadBtn'), exportBtn = byId('exportBtn'), editorMessage = byId('editorMessage');
  const gameImageInput = byId('gameImageInput'), gameReferenceImage = byId('gameReferenceImage');
  const gameImageName = byId('gameImageName'), gameImageOpacity = byId('gameImageOpacity');
  const gameImageOpacityValue = byId('gameImageOpacityValue'), removeGameImageBtn = byId('removeGameImageBtn');
  const gameImageMessage = byId('gameImageMessage');
  let state = initialState(), past = [], future = [];

  const updateHistoryButtons = () => { undoBtn.disabled = !past.length; redoBtn.disabled = !future.length; };
  function commit(nextState) { past.push(cloneState(state)); state = normalizeState(nextState); future = []; render(); }
  function render() {
    canvas.querySelectorAll('.overlay-panel').forEach((panel) => panel.remove());
    const scale = canvas.clientWidth / WIDTH;
    state.panels.forEach((data) => {
      const panel = document.createElement('div');
      panel.className = 'overlay-panel'; panel.dataset.panelId = data.id;
      panel.style.left = `${data.x * scale}px`; panel.style.top = `${data.y * scale}px`;
      enableDragging(panel); canvas.appendChild(panel);
    });
    if (state.gameImage) gameReferenceImage.src = state.gameImage; else gameReferenceImage.removeAttribute('src');
    gameReferenceImage.hidden = !state.gameImage;
    gameReferenceImage.style.opacity = String(state.gameImageOpacity / 100);
    gameImageName.textContent = state.gameImageName || '画像は選択されていません';
    gameImageOpacity.value = String(state.gameImageOpacity);
    gameImageOpacityValue.value = `${state.gameImageOpacity}%`; gameImageOpacityValue.textContent = `${state.gameImageOpacity}%`;
    removeGameImageBtn.disabled = !state.gameImage; updateHistoryButtons();
  }

  addPanelBtn.addEventListener('click', () => {
    const next = cloneState(state);
    const number = next.panels.reduce((max, panel) => Math.max(max, Number(panel.id.replace('panel-', '')) || 0), 0) + 1;
    next.panels.push({ id: `panel-${number}`, x: 40 + number * 16, y: 40 + number * 16 }); commit(next);
  });
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
      start = { pointerX: event.clientX, pointerY: event.clientY, x: panel.x, y: panel.y, before: cloneState(state) };
      element.setPointerCapture(event.pointerId);
    });
    element.addEventListener('pointermove', (event) => {
      if (!start) return; const scale = canvas.clientWidth / WIDTH || 1;
      const panel = state.panels.find((item) => item.id === element.dataset.panelId);
      panel.x = Math.max(0, Math.min(WIDTH - PANEL_W, start.x + (event.clientX - start.pointerX) / scale));
      panel.y = Math.max(0, Math.min(HEIGHT - PANEL_H, start.y + (event.clientY - start.pointerY) / scale));
      element.style.left = `${panel.x * scale}px`; element.style.top = `${panel.y * scale}px`;
    });
    const stop = (event) => {
      if (!start) return;
      if (JSON.stringify(start.before.panels) !== JSON.stringify(state.panels)) { past.push(start.before); future = []; updateHistoryButtons(); }
      start = null; if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    element.addEventListener('pointerup', stop); element.addEventListener('pointercancel', stop);
  }
  root.addEventListener('resize', render); render();
})(typeof window !== 'undefined' ? window : globalThis);
