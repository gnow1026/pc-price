import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

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

        return res.status(200).json({ results: data });
    } catch (error) {
        console.error('검색 오류:', error);
        return res.status(500).json({ error: '검색 중 오류가 발생했습니다' });
    }
}
