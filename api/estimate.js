import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { cpu, ram, gpu, storage, year } = req.body;

    if (!cpu || !ram) {
        return res.status(400).json({ error: 'CPU와 RAM은 필수입니다' });
    }

    try {
        // DB에서 관련 부품 시세 가져오기
        const [cpuData, ramData, gpuData, storageData] = await Promise.all([
            supabase.from('parts').select('name, price').eq('category', 'CPU').ilike('name', `%${cpu}%`).limit(3),
            supabase.from('parts').select('name, price').eq('category', 'RAM').ilike('name', `%${ram}%`).limit(3),
            gpu
                ? supabase.from('parts').select('name, price').eq('category', 'GPU').ilike('name', `%${gpu}%`).limit(3)
                : { data: [] },
            storage
                ? supabase
                      .from('parts')
                      .select('name, price')
                      .eq('category', 'SSD')
                      .ilike('name', `%${storage}%`)
                      .limit(3)
                : { data: [] },
        ]);

        // 시세 데이터 정리
        const priceContext = `
현재 중고 시세 데이터:
CPU 관련: ${cpuData.data?.map((p) => `${p.name}: ${p.price.toLocaleString()}원`).join(', ') || '데이터 없음'}
RAM 관련: ${ramData.data?.map((p) => `${p.name}: ${p.price.toLocaleString()}원`).join(', ') || '데이터 없음'}
GPU 관련: ${gpuData.data?.map((p) => `${p.name}: ${p.price.toLocaleString()}원`).join(', ') || '데이터 없음'}
저장장치 관련: ${storageData.data?.map((p) => `${p.name}: ${p.price.toLocaleString()}원`).join(', ') || '데이터 없음'}
    `;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5',
                max_tokens: 1000,
                messages: [
                    {
                        role: 'user',
                        content: `당신은 중고 PC 시세 전문가입니다. 아래 실제 시세 데이터를 참고해서 PC 가격을 추정해주세요.

${priceContext}

사용자 PC 스펙:
CPU: ${cpu}
RAM: ${ram}
GPU: ${gpu || '내장그래픽'}
저장장치: ${storage || '정보없음'}
제조연도: ${year || '정보없음'}

다음 형식으로 답변해주세요:
- 예상 시세 범위
- 시세 근거 간단히 설명
- 시세에 영향을 주는 핵심 부품
- 판매 시 참고사항

친근하고 이해하기 쉽게 설명해주세요.`,
                    },
                ],
            }),
        });

        const data = await response.json();

        console.log('Claude API 응답:', JSON.stringify(data));

        if (!data.content || !data.content[0]) {
            console.error('API 오류:', data);
            return res.status(500).json({
                error: 'API 응답 오류',
                detail: JSON.stringify(data),
            });
        }

        const text = data.content[0].text;
        return res.status(200).json({ result: text });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
}
