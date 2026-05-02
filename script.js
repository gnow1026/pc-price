async function estimate() {
    const cpu = document.getElementById('cpu').value;
    const ram = document.getElementById('ram').value;
    const gpu = document.getElementById('gpu').value;
    const storage = document.getElementById('storage').value;
    const year = document.getElementById('year').value;

    if (!cpu || !ram) {
        alert('CPU와 RAM은 꼭 입력해주세요!');
        return;
    }

    const btn = document.getElementById('btn');
    btn.disabled = true;
    btn.textContent = '분석 중...';

    try {
        const response = await fetch('/api/estimate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpu, ram, gpu, storage, year }),
        });

        const data = await response.json();

        document.getElementById('result-text').textContent = data.result;
        document.getElementById('result').style.display = 'block';
    } catch (error) {
        alert('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
        btn.disabled = false;
        btn.textContent = '가격 알아보기';
    }
}
