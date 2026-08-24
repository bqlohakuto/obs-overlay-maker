const canvas = document.getElementById('overlayCanvas');
const addPanelBtn = document.getElementById('addPanelBtn');
const gameImageInput = document.getElementById('gameImageInput');
const gameReferenceImage = document.getElementById('gameReferenceImage');
const gameImageName = document.getElementById('gameImageName');
const gameImageOpacity = document.getElementById('gameImageOpacity');
const gameImageOpacityValue = document.getElementById('gameImageOpacityValue');
const removeGameImageBtn = document.getElementById('removeGameImageBtn');
const gameImageMessage = document.getElementById('gameImageMessage');

let panelCount = 0;

gameImageInput.addEventListener('change', () => {
  const [file] = gameImageInput.files;
  gameImageMessage.textContent = '';

  if (!file) return;
  if (!file.type.startsWith('image/')) {
    gameImageInput.value = '';
    gameImageMessage.textContent = '画像ファイルを選択してください。';
    return;
  }

  const reader = new FileReader();
  reader.addEventListener('load', () => {
    gameReferenceImage.src = reader.result;
    gameReferenceImage.hidden = false;
    gameImageName.textContent = file.name;
    removeGameImageBtn.disabled = false;
  });
  reader.addEventListener('error', () => {
    gameImageMessage.textContent = '画像を読み込めませんでした。';
  });
  reader.readAsDataURL(file);
});

gameImageOpacity.addEventListener('input', () => {
  const opacity = Number(gameImageOpacity.value);
  gameReferenceImage.style.opacity = String(opacity / 100);
  gameImageOpacityValue.value = `${opacity}%`;
  gameImageOpacityValue.textContent = `${opacity}%`;
});

removeGameImageBtn.addEventListener('click', () => {
  gameReferenceImage.removeAttribute('src');
  gameReferenceImage.hidden = true;
  gameImageInput.value = '';
  gameImageName.textContent = '画像は選択されていません';
  gameImageMessage.textContent = '';
  removeGameImageBtn.disabled = true;
});

addPanelBtn.addEventListener('click', () => {
  panelCount += 1;

  const panel = document.createElement('div');
  panel.className = 'overlay-panel';
  panel.dataset.panelId = `panel-${panelCount}`;
  panel.style.left = `${40 + panelCount * 16}px`;
  panel.style.top = `${40 + panelCount * 16}px`;

  enableDragging(panel);
  canvas.appendChild(panel);
});

function enableDragging(element) {
  let dragging = false;
  let startPointerX = 0;
  let startPointerY = 0;
  let startLeft = 0;
  let startTop = 0;

  element.addEventListener('pointerdown', (event) => {
    dragging = true;
    startPointerX = event.clientX;
    startPointerY = event.clientY;
    startLeft = element.offsetLeft;
    startTop = element.offsetTop;
    element.setPointerCapture(event.pointerId);
  });

  element.addEventListener('pointermove', (event) => {
    if (!dragging) return;

    const scaleX = canvas.clientWidth / 1920;
    const displayScale = scaleX || 1;
    const dx = (event.clientX - startPointerX) / displayScale;
    const dy = (event.clientY - startPointerY) / displayScale;

    const widthInCanvasUnits = element.offsetWidth / displayScale;
    const heightInCanvasUnits = element.offsetHeight / displayScale;
    const maxLeft = 1920 - widthInCanvasUnits;
    const maxTop = 1080 - heightInCanvasUnits;

    const nextLeft = Math.max(0, Math.min(maxLeft, (startLeft / displayScale) + dx));
    const nextTop = Math.max(0, Math.min(maxTop, (startTop / displayScale) + dy));

    element.style.left = `${nextLeft * displayScale}px`;
    element.style.top = `${nextTop * displayScale}px`;
  });

  const stopDragging = (event) => {
    dragging = false;
    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
  };

  element.addEventListener('pointerup', stopDragging);
  element.addEventListener('pointercancel', stopDragging);
}
