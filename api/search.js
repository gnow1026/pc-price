import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const BRAND_KEYWORDS = {
    인텔: 'i',
    AMD: '라이젠',
    엔비디아: 'rtx',
    SK하이닉스: 'hynix',
    삼성: '삼성',
    마이크론: 'crucial',
    인텔용: 'intel',
    AMD용: 'amd',
    'NVMe SSD': 'nvme',
    'SATA SSD': 'sata',
    HDD: 'hdd',
    LG: 'lg',
    레노버: '레노버',
    HP: 'hp',
    Dell: 'dell',
    ASUS: 'asus',
    파워서플라이: '파워',
    쿨러: '쿨러',
    모니터: '모니터',
    프린터: '프린터',
    서버: '서버',
    네트워크: '네트워크',
    기타: '',
};

const SERIES_KEYWORDS = {
    Ultra: 'ultra',
    '14세대': '14세대',
    '13세대': '13세대',
    '12세대': '12세대',
    '11세대': '11세대',
    '10세대': '10세대',
    '9세대': '9세대',
    '8세대': '8세대',
    '7세대': '7세대',
    '6세대': '6세대',
    '4세대': '4세대',
    '3세대': '3세대',
    '2세대': '2세대',
    Xeon: 'xeon',
    셀러론: '셀러론',
    펜티엄: '펜티엄',
    라이젠9: '라이젠9',
    라이젠7: '라이젠7',
    라이젠5: '라이젠5',
    라이젠3: '라이젠3',
    EPYC: 'epyc',
    'RTX 40': 'rtx 40',
    'RTX 30': 'rtx 30',
    'RTX 20': 'rtx 20',
    'GTX 16': 'gtx 16',
    'GTX 10': 'gtx 10',
    'RX 7000': 'rx 7',
    'RX 6000': 'rx 6',
    'RX 5000': 'rx 5',
    DDR5: 'ddr5',
    DDR4: 'ddr4',
    DDR3: 'ddr3',
    Z790: 'z790',
    Z690: 'z690',
    B760: 'b760',
    B660: 'b660',
    H610: 'h610',
    X670: 'x670',
    B650: 'b650',
    X570: 'x570',
    B550: 'b550',
    A520: 'a520',
};

function cleanName(name) {
    return (
        name
            // 대괄호 내용 제거
            .replace(/\[[^\]]*\]/g, '')
            // 괄호 내용 제거
            .replace(/\([^)]*\)/g, '')
            // 특수문자 제거
            .replace(/[◆★●■▶]/g, '')
            // 세대 표시 제거
            .replace(/[0-9]+세대\s*/g, '')
            // 코드명 제거
            .replace(
                /\s*(하스웰|커피레이크R?|스카이레이크|카비레이크R?|아이비브릿지|샌디브릿지|랩터레이크R?|엘더레이크|로켓레이크|코멧레이크|애로우레이크|리프레시|리프레쉬)\s*/gi,
                ' ',
            )
            // 불필요한 단어 제거
            .replace(/중고/gi, '')
            .replace(/벌크/gi, '')
            .replace(/정품/gi, '')
            .replace(/병행수입/gi, '')
            .replace(/랜덤\s*발송/gi, '')
            .replace(/랜덤/gi, '')
            .replace(/탈거/gi, '')
            // 연속 공백 정리
            .replace(/\s+/g, ' ')
            .trim()
    );
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { category, brand, series, keyword } = req.body;

    try {
        let query = supabase.from('parts').select('name, clean_name, price').order('price', { ascending: true });

        if (category) query = query.eq('category', category);

        const brandKeyword = BRAND_KEYWORDS[brand] !== undefined ? BRAND_KEYWORDS[brand] : brand;
        const seriesKeyword = SERIES_KEYWORDS[series] || series;

        if (brandKeyword) query = query.ilike('name', `%${brandKeyword}%`);
        if (seriesKeyword) query = query.ilike('name', `%${seriesKeyword}%`);
        if (keyword) query = query.ilike('name', `%${keyword}%`);

        const { data, error } = await query.limit(100);
        if (error) throw error;

        const results = data.map((item) => ({
            name: cleanName(item.clean_name || item.name),
            price: item.price,
        }));

        return res.status(200).json({ results });
    } catch (error) {
        console.error('검색 오류:', error);
        return res.status(500).json({ error: '검색 중 오류가 발생했습니다' });
    }
}
