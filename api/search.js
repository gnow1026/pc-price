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
    '14세대': 'i.-14',
    '13세대': 'i.-13',
    '12세대': 'i.-12',
    '11세대': 'i.-11',
    '10세대': 'i.-10',
    '9세대': 'i.-9',
    '8세대': 'i.-8',
    '7세대': 'i.-7',
    '6세대': 'i.-6',
    '4세대': 'i.-4',
    '3세대': 'i.-3',
    '2세대': 'i.-2',
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

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { category, brand, series, keyword } = req.body;

    try {
        let query = supabase.from('parts').select('name, price').order('price', { ascending: true });

        if (category) query = query.eq('category', category);

        const brandKeyword = BRAND_KEYWORDS[brand] !== undefined ? BRAND_KEYWORDS[brand] : brand;
        const seriesKeyword = SERIES_KEYWORDS[series] || series;

        if (brandKeyword) query = query.ilike('name', `%${brandKeyword}%`);
        if (seriesKeyword) query = query.ilike('name', `%${seriesKeyword}%`);
        if (keyword) query = query.ilike('name', `%${keyword}%`);

        const { data, error } = await query.limit(100);
        if (error) throw error;

        return res.status(200).json({ results: data });
    } catch (error) {
        console.error('검색 오류:', error);
        return res.status(500).json({ error: '검색 중 오류가 발생했습니다' });
    }
}
