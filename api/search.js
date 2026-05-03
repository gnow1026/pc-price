import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function cleanName(name) {
    return (
        name
            // 대괄호 태그 제거 [INTEL], [AMD], [중고제품] 등
            .replace(/\[INTEL\]/gi, '')
            .replace(/\[AMD\]/gi, '')
            .replace(/\[삼성전자\]/gi, '')
            .replace(/\[삼성\]/gi, '')
            .replace(/\[LG\]/gi, '')
            // 중고 관련 태그 제거
            .replace(/\[중고제품\]/gi, '')
            .replace(/\[중고\]/gi, '')
            .replace(/\[탈거제품[^\]]*\]/gi, '')
            .replace(/\[리퍼제품\]/gi, '')
            .replace(/\[리퍼비시\]/gi, '')
            // A/S 관련 제거
            .replace(/\[A\/S\s*\d+개월\]/gi, '')
            .replace(/\[AS\s*\d+개월\]/gi, '')
            .replace(/\[A\/S\s*무상\s*\d+개월\]/gi, '')
            .replace(/A\/S\s*\d+개월/gi, '')
            .replace(/AS\s*\d+개월/gi, '')
            // 기타 태그 제거
            .replace(/\[쿨러미포함\]/gi, '')
            .replace(/\[쿨러포함\]/gi, '')
            .replace(/\[벌크\]/gi, '')
            .replace(/\[정품\]/gi, '')
            .replace(/\[병행수입\]/gi, '')
            .replace(/\[대리점정품\]/gi, '')
            .replace(/\[컴퓨존인증\]/gi, '')
            // 괄호 안 긴 설명 제거
            .replace(/\([^)]{15,}\)/g, '')
            // 특수문자 제거
            .replace(/[◆★●■▶]/g, '')
            // 말줄임표 제거
            .replace(/\.{2,}/g, '')
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
        let query = supabase.from('parts').select('name, price').order('price', { ascending: true });

        if (category) query = query.eq('category', category);

        const keywords = [];
        if (brand) keywords.push(brand);
        if (series) keywords.push(series);
        if (keyword) keywords.push(keyword);

        for (const kw of keywords) {
            query = query.ilike('name', `%${kw}%`);
        }

        const { data, error } = await query.limit(100);
        if (error) throw error;

        const results = data.map((item) => ({
            name: cleanName(item.name),
            price: item.price,
            originalName: item.name,
        }));

        return res.status(200).json({ results });
    } catch (error) {
        console.error('검색 오류:', error);
        return res.status(500).json({ error: '검색 중 오류가 발생했습니다' });
    }
}
