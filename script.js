const state = {
    cpu: { brand: '', series: '', model: '' },
    ram: { type: '', size: '' },
    gpu: { brand: '', series: '', model: '' },
    storages: [],
    year: '',
};

const MAX_STORAGE = 4;
const COOLDOWN = 30;
let cooldownTimer = null;
let storageCount = 0;

const CPU_SERIES = {
    인텔: [
        'Ultra',
        '14세대',
        '13세대',
        '12세대',
        '11세대',
        '10세대',
        '9세대',
        '8세대',
        '7세대',
        '6세대',
        '4세대',
        '3세대',
        '2세대',
        'Xeon',
        '셀러론',
        '펜티엄',
    ],
    AMD: ['라이젠9', '라이젠7', '라이젠5', '라이젠3', 'EPYC'],
};

const GPU_SERIES = {
    엔비디아: ['RTX 40', 'RTX 30', 'RTX 20', 'GTX 16', 'GTX 10'],
    AMD: ['RX 7000', 'RX 6000', 'RX 5000'],
};

function setActive(groupId, value) {
    document.querySelectorAll(`#${groupId} .sel-btn`).forEach((b) => {
        b.classList.toggle('active', b.textContent === value);
    });
}

function showGroup(id) {
    document.getElementById(id).classList.remove('hidden');
}
function hideGroup(id) {
    document.getElementById(id).classList.add('hidden');
}

// CPU
function selectCpuBrand(brand) {
    state.cpu = { brand, series: '', model: '' };
    setActive('cpu-brand', brand);

    const seriesGroup = document.getElementById('cpu-series');
    seriesGroup.innerHTML = CPU_SERIES[brand]
        .map((s) => `<button class="sel-btn" onclick="selectCpuSeries('${s}')">${s}</button>`)
        .join('');
    showGroup('cpu-series');
    hideGroup('cpu-model');
}

async function selectCpuSeries(series) {
    state.cpu.series = series;
    state.cpu.model = '';
    setActive('cpu-series', series);

    const modelGroup = document.getElementById('cpu-model');
    modelGroup.innerHTML = '<span class="loading-text">불러오는 중...</span>';
    showGroup('cpu-model');

    const models = await fetchModels('CPU', state.cpu.brand, series);
    modelGroup.innerHTML = models
        .map(
            (m) =>
                `<button class="sel-btn model-btn" onclick="selectCpuModel('${m.name.replace(/'/g, "\\'")}')">${m.name}</button>`,
        )
        .join('');
}

function selectCpuModel(model) {
    state.cpu.model = model;
    document.querySelectorAll('#cpu-model .sel-btn').forEach((b) => {
        b.classList.toggle('active', b.textContent === model);
    });
}

// RAM
function selectRamType(type) {
    state.ram = { type, size: '' };
    setActive('ram-type', type);
    showGroup('ram-size');
}

function selectRamSize(size) {
    state.ram.size = size;
    setActive('ram-size', size);
}

// GPU
function selectGpuBrand(brand) {
    state.gpu = { brand, series: '', model: '' };
    setActive('gpu-brand', brand);

    if (brand === '없음') {
        hideGroup('gpu-series');
        hideGroup('gpu-model');
        return;
    }

    const seriesGroup = document.getElementById('gpu-series');
    seriesGroup.innerHTML = GPU_SERIES[brand]
        .map((s) => `<button class="sel-btn" onclick="selectGpuSeries('${s}')">${s}</button>`)
        .join('');
    showGroup('gpu-series');
    hideGroup('gpu-model');
}

async function selectGpuSeries(series) {
    state.gpu.series = series;
    state.gpu.model = '';
    setActive('gpu-series', series);

    const modelGroup = document.getElementById('gpu-model');
    modelGroup.innerHTML = '<span class="loading-text">불러오는 중...</span>';
    showGroup('gpu-model');

    const models = await fetchModels('그래픽카드', state.gpu.brand, series);
    modelGroup.innerHTML = models
        .map(
            (m) =>
                `<button class="sel-btn model-btn" onclick="selectGpuModel('${m.name.replace(/'/g, "\\'")}')">${m.name}</button>`,
        )
        .join('');
}

function selectGpuModel(model) {
    state.gpu.model = model;
    document.querySelectorAll('#gpu-model .sel-btn').forEach((b) => {
        b.classList.toggle('active', b.textContent === model);
    });
}

// 저장장치
function addStorage() {
    if (storageCount >= MAX_STORAGE) return;

    const id = Date.now();
    storageCount++;

    state.storages.push({ id, type: '', size: '' });

    const list = document.getElementById('storage-list');
    const div = document.createElement('div');
    div.className = 'storage-item';
    div.id = `storage-${id}`;
    div.innerHTML = `
    <div class="storage-item-header">
      <span class="storage-item-title">저장장치 ${storageCount}</span>
      <button class="remove-btn" onclick="removeStorage(${id})">×</button>
    </div>
    <div class="btn-group" id="storage-type-${id}">
      <button class="sel-btn" onclick="selectStorageType(${id}, 'NVMe SSD')">NVMe SSD</button>
      <button class="sel-btn" onclick="selectStorageType(${id}, 'SATA SSD')">SATA SSD</button>
      <button class="sel-btn" onclick="selectStorageType(${id}, 'HDD')">HDD</button>
    </div>
    <div class="btn-group hidden" id="storage-size-${id}">
      <button class="sel-btn" onclick="selectStorageSize(${id}, '256GB')">256GB</button>
      <button class="sel-btn" onclick="selectStorageSize(${id}, '512GB')">512GB</button>
      <button class="sel-btn" onclick="selectStorageSize(${id}, '1TB')">1TB</button>
      <button class="sel-btn" onclick="selectStorageSize(${id}, '2TB')">2TB</button>
      <button class="sel-btn" onclick="selectStorageSize(${id}, '4TB')">4TB</button>
    </div>
  `;
    list.appendChild(div);

    if (storageCount >= MAX_STORAGE) {
        document.getElementById('add-storage-btn').disabled = true;
    }
}

function removeStorage(id) {
    state.storages = state.storages.filter((s) => s.id !== id);
    document.getElementById(`storage-${id}`).remove();
    storageCount--;

    // 번호 다시 매기기
    document.querySelectorAll('.storage-item-title').forEach((el, i) => {
        el.textContent = `저장장치 ${i + 1}`;
    });

    document.getElementById('add-storage-btn').disabled = false;
}

function selectStorageType(id, type) {
    const storage = state.storages.find((s) => s.id === id);
    if (storage) {
        storage.type = type;
        storage.size = '';
    }

    document.querySelectorAll(`#storage-type-${id} .sel-btn`).forEach((b) => {
        b.classList.toggle('active', b.textContent === type);
    });
    document.getElementById(`storage-size-${id}`).classList.remove('hidden');
}

function selectStorageSize(id, size) {
    const storage = state.storages.find((s) => s.id === id);
    if (storage) storage.size = size;

    document.querySelectorAll(`#storage-size-${id} .sel-btn`).forEach((b) => {
        b.classList.toggle('active', b.textContent === size);
    });
}

// 제조연도
function selectYear(year) {
    state.year = year;
    setActive('year-group', year);
}

// DB에서 모델 가져오기
async function fetchModels(category, brand, series) {
    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, brand, series }),
        });
        const data = await response.json();

        const seen = new Set();
        return (data.results || []).filter((m) => {
            if (seen.has(m.name)) return false;
            seen.add(m.name);
            return true;
        });
    } catch (e) {
        return [];
    }
}

// 로딩
function showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

// 쿨다운
function startCooldown() {
    const btn = document.getElementById('estimate-btn');
    let seconds = COOLDOWN;
    btn.disabled = true;
    btn.textContent = `${seconds}초 후 다시 시도`;

    cooldownTimer = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
            clearInterval(cooldownTimer);
            btn.disabled = false;
            btn.textContent = '가격 알아보기';
        } else {
            btn.textContent = `${seconds}초 후 다시 시도`;
        }
    }, 1000);
}

// 가격 추정
async function estimate() {
    if (!state.cpu.brand || !state.ram.type) {
        alert('CPU와 RAM은 필수로 선택해주세요!');
        return;
    }

    showLoading();

    const cpu = state.cpu.model || state.cpu.series || state.cpu.brand;
    const ram = `${state.ram.type} ${state.ram.size}`.trim();
    const gpu = state.gpu.model || state.gpu.series || state.gpu.brand || '';
    const storageText = state.storages
        .filter((s) => s.type)
        .map((s) => `${s.type} ${s.size}`.trim())
        .join(', ');
    const year = state.year;

    try {
        const response = await fetch('/api/estimate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpu, ram, gpu, storage: storageText, year }),
        });

        const data = await response.json();

        document.getElementById('result-text').textContent = data.result;
        document.getElementById('result').classList.remove('hidden');
        document.getElementById('result').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        alert('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
        hideLoading();
        startCooldown();
    }
}

// 팝업
function showComingSoon() {
    document.getElementById('popup-overlay').classList.remove('hidden');
}

function hidePopup() {
    document.getElementById('popup-overlay').classList.add('hidden');
}

// 페이지 로드시 저장장치 1개 자동 추가
addStorage();
