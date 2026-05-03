const state = {
    cpu: { brand: '', series: '', model: '' },
    ram: { type: '', size: '' },
    gpu: { brand: '', series: '', model: '' },
    storage: { type: '', size: '' },
    year: '',
};

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
    setActive('cpu-model', model);
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
    setActive('gpu-model', model);
}

// 저장장치
function selectStorageType(type) {
    state.storage = { type, size: '' };
    setActive('storage-type', type);
    showGroup('storage-size');
}

function selectStorageSize(size) {
    state.storage.size = size;
    setActive('storage-size', size);
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

        // 중복 제거
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

// 가격 추정
async function estimate() {
    if (!state.cpu.brand || !state.ram.type) {
        alert('CPU와 RAM은 필수로 선택해주세요!');
        return;
    }

    const btn = document.getElementById('estimate-btn');
    btn.disabled = true;
    btn.textContent = '분석 중...';

    const cpu = state.cpu.model || state.cpu.series || state.cpu.brand;
    const ram = `${state.ram.type} ${state.ram.size}`.trim();
    const gpu = state.gpu.model || state.gpu.series || state.gpu.brand || '';
    const storage = `${state.storage.type} ${state.storage.size}`.trim();
    const year = state.year;

    try {
        const response = await fetch('/api/estimate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpu, ram, gpu, storage, year }),
        });

        const data = await response.json();

        document.getElementById('result-text').textContent = data.result;
        document.getElementById('result').classList.remove('hidden');
        document.getElementById('result').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        alert('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
        btn.disabled = false;
        btn.textContent = '가격 알아보기';
    }
}

function showComingSoon() {
    document.getElementById('popup-overlay').classList.remove('hidden');
}

function hidePopup() {
    document.getElementById('popup-overlay').classList.add('hidden');
}
