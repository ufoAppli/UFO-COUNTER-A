const STORAGE_KEY = 'ufo-counter-alpha-state-v1';

const defaultState = () => ({ shops: [] });

let state = loadState();
let currentPage = 'page1';
let selectedShopName = null;
let currentCameraShopName = null;

const elements = {
  page1: document.getElementById('page1'),
  page2: document.getElementById('page2'),
  pageA: document.getElementById('pageA'),
  pageB: document.getElementById('pageB'),
  shopInput: document.getElementById('shopInput'),
  cameraInput: document.getElementById('cameraInput'),
  cameraBtn: document.getElementById('cameraBtn'),
  startCountBtn: document.getElementById('startCountBtn'),
  viewDataBtn: document.getElementById('viewDataBtn'),
  counterList: document.getElementById('counterList'),
  addCounterBtn: document.getElementById('addCounterBtn'),
  finishCountBtn: document.getElementById('finishCountBtn'),
  shopList: document.getElementById('shopList'),
  backToHomeBtn: document.getElementById('backToHomeBtn'),
  shopDetailTitle: document.getElementById('shopDetailTitle'),
  detailList: document.getElementById('detailList'),
  detailBackBtn: document.getElementById('detailBackBtn'),
  deleteShopBtn: document.getElementById('deleteShopBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn')
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultState();
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setPage(pageName) {
  currentPage = pageName;
  document.querySelectorAll('.page').forEach((page) => page.classList.toggle('active', page.id === pageName));
}

function getShop(shopName) {
  return state.shops.find((shop) => shop.name === shopName);
}

function createShopEntry(shopName) {
  if (!state.shops.some((shop) => shop.name === shopName)) {
    state.shops.push({ name: shopName, counters: [], photos: [] });
  }
  return getShop(shopName);
}

function getUniqueShopName(rawValue) {
  const base = (rawValue || '').trim();
  const baseName = base || `店舗${state.shops.length + 1}`;
  const existingNames = state.shops.map((shop) => shop.name);
  let candidate = baseName;
  let suffix = 1;
  while (existingNames.includes(candidate)) {
    candidate = `${baseName}${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function sanitizeFileName(value) {
  return value.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40) || 'photo';
}

function createCounter() {
  return { id: Date.now() + Math.random().toString(36).slice(2), title: '', count: 0 };
}

function ensureCounters(shopName) {
  const shop = getShop(shopName);
  if (!shop.counters.length) {
    shop.counters.push(createCounter());
  }
  return shop;
}

function renderPage2() {
  const shop = ensureCounters(selectedShopName);
  const currentFocusId = document.activeElement?.getAttribute('data-id');
  const currentSelectionStart = document.activeElement?.selectionStart;
  const currentSelectionEnd = document.activeElement?.selectionEnd;

  elements.counterList.innerHTML = '';
  shop.counters.forEach((counter) => {
    const card = document.createElement('div');
    card.className = 'counter-card';
    card.innerHTML = `
      <div class="counter-row">
        <input type="text" value="${counter.title}" data-role="title" data-id="${counter.id}" placeholder="ここにタイトル入力" />
        <button class="counter-btn" data-role="minus" data-id="${counter.id}">-</button>
        <button class="counter-btn" data-role="plus" data-id="${counter.id}">+</button>
      </div>
      <div class="count-value">${counter.count}</div>
    `;
    elements.counterList.appendChild(card);
  });

  if (currentFocusId) {
    const focusedInput = elements.counterList.querySelector(`input[data-id="${currentFocusId}"]`);
    if (focusedInput) {
      focusedInput.focus();
      if (typeof currentSelectionStart === 'number' && typeof currentSelectionEnd === 'number') {
        focusedInput.setSelectionRange(currentSelectionStart, currentSelectionEnd);
      }
    }
  }
}

function updateCounter(id, patch) {
  const shop = getShop(selectedShopName);
  if (!shop) return;
  shop.counters = shop.counters.map((counter) => (counter.id === id ? { ...counter, ...patch } : counter));
  saveState();
}

function bindPage2Events() {
  elements.counterList.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const id = button.getAttribute('data-id');
    const role = button.getAttribute('data-role');
    const shop = getShop(selectedShopName);
    if (!shop) return;
    const counter = shop.counters.find((item) => item.id === id);
    if (!counter) return;
    if (role === 'minus') {
      counter.count = Math.max(0, counter.count - 1);
      vibrateOnce();
    }
    if (role === 'plus') {
      counter.count = Math.min(255, counter.count + 1);
      vibrateOnce();
    }
    saveState();
    renderPage2();
  });

  elements.counterList.addEventListener('input', (event) => {
    const input = event.target;
    if (input.getAttribute('data-role') !== 'title') return;
    const id = input.getAttribute('data-id');
    updateCounter(id, { title: input.value });
  });

  elements.addCounterBtn.addEventListener('click', () => {
    const shop = getShop(selectedShopName);
    if (!shop) return;
    shop.counters.push(createCounter());
    saveState();
    renderPage2();
  });

  elements.finishCountBtn.addEventListener('click', () => {
    saveState();
    setPage('page1');
    elements.shopInput.value = selectedShopName || '';
  });
}

function renderShopList() {
  elements.shopList.innerHTML = '';
  if (!state.shops.length) {
    elements.shopList.innerHTML = '<div class="shop-item">まだデータがありません</div>';
    return;
  }
  state.shops.forEach((shop) => {
    const button = document.createElement('button');
    button.className = 'button primary';
    button.textContent = shop.name;
    button.addEventListener('click', () => {
      selectedShopName = shop.name;
      setPage('pageB');
      renderPageB();
    });
    elements.shopList.appendChild(button);
  });
}

function renderPageB() {
  const shop = getShop(selectedShopName);
  if (!shop) {
    setPage('pageA');
    renderShopList();
    return;
  }
  elements.shopDetailTitle.textContent = `データ表示：${shop.name}`;
  elements.detailList.innerHTML = '';
  if (!shop.counters.length) {
    elements.detailList.innerHTML = '<div class="detail-item">表示するデータがありません</div>';
    return;
  }
  shop.counters.forEach((counter) => {
    const item = document.createElement('div');
    item.className = 'detail-item';
    item.textContent = `${counter.title || '無題'}：${counter.count}`;
    elements.detailList.appendChild(item);
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const CRC_TABLE = (() => {
  const table = [];
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function buildZip(entries) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  entries.forEach((entry) => {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data);
    const crc = crc32(dataBytes);
    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint32(14, 0, true);
    view.setUint32(18, crc, true);
    view.setUint32(22, dataBytes.length, true);
    view.setUint32(26, dataBytes.length, true);
    view.setUint16(30, nameBytes.length, true);
    view.setUint16(32, 0, true);
    header.set(nameBytes, 30);

    localParts.push(header, dataBytes);
    centralParts.push(() => {
      const centralHeader = new Uint8Array(46 + nameBytes.length);
      const cview = new DataView(centralHeader.buffer);
      cview.setUint32(0, 0x02014b50, true);
      cview.setUint16(4, 20, true);
      cview.setUint16(6, 20, true);
      cview.setUint16(8, 0, true);
      cview.setUint16(10, 0, true);
      cview.setUint16(12, 0, true);
      cview.setUint16(14, 0, true);
      cview.setUint16(16, 0, true);
      cview.setUint32(18, crc, true);
      cview.setUint32(22, dataBytes.length, true);
      cview.setUint32(26, dataBytes.length, true);
      cview.setUint16(30, nameBytes.length, true);
      cview.setUint16(32, 0, true);
      cview.setUint16(34, 0, true);
      cview.setUint16(36, 0, true);
      cview.setUint16(38, 0, true);
      cview.setUint16(40, 0, true);
      cview.setUint32(42, 0, true);
      cview.setUint32(46, offset, true);
      centralHeader.set(nameBytes, 46);
      return centralHeader;
    });
    offset += 30 + nameBytes.length + dataBytes.length;
  });

  const centralDirectory = [];
  entries.forEach((entry, index) => {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data);
    const crc = crc32(dataBytes);
    const header = new Uint8Array(46 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0, true);
    view.setUint16(16, 0, true);
    view.setUint32(18, crc, true);
    view.setUint32(22, dataBytes.length, true);
    view.setUint32(26, dataBytes.length, true);
    view.setUint16(30, nameBytes.length, true);
    view.setUint16(32, 0, true);
    view.setUint16(34, 0, true);
    view.setUint16(36, 0, true);
    view.setUint16(38, 0, true);
    view.setUint16(40, 0, true);
    view.setUint32(42, 0, true);
    view.setUint32(46, (index === 0 ? 0 : 0), true);
    header.set(nameBytes, 46);
    centralDirectory.push(header);
  });

  const centralOffset = offset;
  const centralDirectoryBytes = concatUint8Arrays(centralDirectory);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralDirectoryBytes.length, true);
  endView.setUint32(16, centralOffset, true);
  endView.setUint16(20, 0, true);

  return new Blob([concatUint8Arrays(localParts), centralDirectoryBytes, endRecord], { type: 'application/zip' });
}

function concatUint8Arrays(parts) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function vibrateOnce() {
  try {
    navigator.vibrate?.([40, 20, 40]);
  } catch (error) {
    // ignore
  }
}

function getOrCreateActiveShopName() {
  if (selectedShopName && getShop(selectedShopName)) {
    return selectedShopName;
  }
  if (currentCameraShopName && getShop(currentCameraShopName)) {
    selectedShopName = currentCameraShopName;
    return currentCameraShopName;
  }

  const shopName = getUniqueShopName(elements.shopInput.value);
  createShopEntry(shopName);
  selectedShopName = shopName;
  currentCameraShopName = shopName;
  saveState();
  return shopName;
}

function buildPhotoDownloadName(shopName, dataUrl) {
  const safeName = (shopName || 'photo').replace(/[\\/:*?"<>|]/g, '').slice(0, 30) || 'photo';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const mimeMatch = dataUrl.match(/^data:(.+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const extension = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
  return `${safeName}-${timestamp}.${extension}`;
}

function savePhotoViaWeb(dataUrl, shopName) {
  const fileName = buildPhotoDownloadName(shopName, dataUrl);
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  return true;
}

function startCamera() {
  getOrCreateActiveShopName();
  elements.cameraInput.value = '';
  elements.cameraInput.click();
}

function handleFileSelection(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const shopName = getOrCreateActiveShopName();
    const shop = getShop(shopName);
    if (!shop) return;

    shop.photos.push({
      id: Date.now() + Math.random().toString(36).slice(2),
      name: `${sanitizeFileName(shop.name)}.png`,
      photo: dataUrl,
      createdAt: new Date().toISOString()
    });
    saveState();
    savePhotoViaWeb(dataUrl, shop.name);
    window.alert('写真を保存しました。');
  };
  reader.onerror = () => {
    window.alert('画像の読み込みに失敗しました。');
  };
  reader.readAsDataURL(file);
}

function sanitizeExportFileName(value) {
  return String(value || 'photo').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 40) || 'photo';
}

function getPhotoExtensionFromDataUrl(dataUrl) {
  const mimeMatch = dataUrl.match(/^data:(.+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  return 'jpg';
}

function buildPhotoExportEntries(shop) {
  const entries = [];
  (shop.photos || []).forEach((photo, index) => {
    if (!photo || !photo.photo) return;
    const extension = getPhotoExtensionFromDataUrl(photo.photo);
    const fileName = `${sanitizeExportFileName(shop.name)}-${index + 1}.${extension}`;
    entries.push({ fileName, dataUrl: photo.photo });
  });
  return entries;
}

async function exportCurrentShopCsv() {
  const shop = getShop(selectedShopName);
  if (!shop) return;
  if (typeof JSZip === 'undefined') {
    window.alert('ZIP作成ライブラリの読み込みに失敗しました。');
    return;
  }

  const header = ['筐体名', 'カウント値'];
  const rows = shop.counters.map((counter) => [
    String(counter.title || '無題').replace(/\r?\n/g, ' ').replace(/"/g, '""'),
    String(counter.count)
  ]);
  const csvRows = [header, ...rows].map((cells) => cells.map((cell) => `"${String(cell ?? '').replace(/\r?\n/g, ' ').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const csvData = '\uFEFF' + csvRows;

  const zip = new JSZip();
  zip.file(`${sanitizeExportFileName(shop.name)}.csv`, csvData, { type: 'text/plain;charset=shift_jis' });

  const photoEntries = buildPhotoExportEntries(shop);
  const photoBlobs = await Promise.all(photoEntries.map(async (entry) => {
    const response = await fetch(entry.dataUrl);
    const blob = await response.blob();
    return { fileName: entry.fileName, blob };
  }));

  photoBlobs.forEach((photo) => {
    zip.file(`photos/${photo.fileName}`, photo.blob, { binary: true });
  });

  if (photoEntries.length === 0) {
    zip.file('photos/README.txt', '写真はありません。');
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(zipBlob, `${sanitizeExportFileName(shop.name)}.zip`);
  window.alert('写真付きZIPを出力しました。');
}

function attachEvents() {
  elements.cameraBtn.addEventListener('click', () => {
    startCamera();
  });

  elements.startCountBtn.addEventListener('click', () => {
    const shopName = getOrCreateActiveShopName();
    selectedShopName = shopName;
    saveState();
    renderPage2();
    setPage('page2');
  });

  elements.viewDataBtn.addEventListener('click', () => {
    selectedShopName = null;
    renderShopList();
    setPage('pageA');
  });

  elements.backToHomeBtn.addEventListener('click', () => {
    setPage('page1');
  });

  elements.detailBackBtn.addEventListener('click', () => {
    setPage('pageA');
    renderShopList();
  });

  elements.deleteShopBtn.addEventListener('click', () => {
    state.shops = state.shops.filter((shop) => shop.name !== selectedShopName);
    saveState();
    selectedShopName = null;
    renderShopList();
    setPage('pageA');
  });

  elements.exportCsvBtn.addEventListener('click', () => {
    exportCurrentShopCsv();
  });
  elements.cameraInput.addEventListener('change', handleFileSelection);
}

function init() {
  attachEvents();
  bindPage2Events();
  setPage('page1');
  renderShopList();
  if (state.shops.length) {
    selectedShopName = state.shops[0].name;
    renderPageB();
  }
}

init();
