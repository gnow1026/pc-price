export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { cpu, ram, gpu, storage, year } = req.body;

    if (!cpu || !ram) {
        return res.status(400).json({ error: 'CPU와 RAM은 필수입니다' });
    }

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                messages: [
                    {
                        role: 'user',
                        content: `당신은 중고 PC 시세 전문가입니다. 아래 스펙의 PC 중고 시세를 한국 중고 시장 기준으로 추정해주세요.
  
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
        const text = data.content[0].text;

        return res.status(200).json({ result: text });
    } catch (error) {
        return res.status(500).json({ error: '서버 오류가 발생했습니다' });
    }
}
