import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function cleanBatch(items) {
    const nameList = items.map((item, i) => `${i + 1}. ${item.name}`).join('\n');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: 2000,
            messages: [
                {
                    role: 'user',
                    content: `아래는 중고 PC 부품 이름 목록이에요. 각 이름을 깔끔하고 간결하게 정제해주세요.

규칙:
- [INTEL], [AMD], [삼성] 같은 브랜드 태그 제거
- [중고제품], [A/S 6개월], [쿨러미포함] 같은 부가 설명 제거
- 괄호 안 긴 설명 제거
- 핵심 모델명만 남기기
- 번호는 그대로 유지
- JSON 배열로만 응답 (다른 말 없이)
- 형식: ["정제된이름1", "정제된이름2", ...]

${nameList}`,
                },
            ],
        }),
    });

    const data = await response.json();
    const text = data.content[0].text.trim();

    try {
        const cleaned = JSON.parse(text);
        return cleaned;
    } catch (e) {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) return JSON.parse(match[0]);
        return items.map((item) => item.name);
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // DB에서 전체 데이터 가져오기
        const { data: parts, error } = await supabase.from('parts').select('id, name').order('id', { ascending: true });

        if (error) throw error;

        console.log(`총 ${parts.length}개 처리 시작`);

        const batchSize = 50;
        let totalUpdated = 0;

        for (let i = 0; i < parts.length; i += batchSize) {
            const batch = parts.slice(i, i + batchSize);
            console.log(`배치 ${Math.floor(i / batchSize) + 1}/${Math.ceil(parts.length / batchSize)} 처리중...`);

            const cleanedNames = await cleanBatch(batch);

            // DB 업데이트
            for (let j = 0; j < batch.length; j++) {
                if (cleanedNames[j] && cleanedNames[j] !== batch[j].name) {
                    await supabase.from('parts').update({ name: cleanedNames[j] }).eq('id', batch[j].id);
                    totalUpdated++;
                }
            }

            await new Promise((r) => setTimeout(r, 1000));
        }

        return res.status(200).json({
            message: '이름 정제 완료!',
            total: parts.length,
            updated: totalUpdated,
        });
    } catch (error) {
        console.error('오류:', error);
        return res.status(500).json({ error: error.message });
    }
}
