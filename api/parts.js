import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { category, keyword } = req.query;

    try {
        let query = supabase.from('parts').select('*').order('updated_at', { ascending: false });

        if (category) {
            query = query.eq('category', category);
        }

        if (keyword) {
            query = query.ilike('name', `%${keyword}%`);
        }

        const { data, error } = await query.limit(20);

        if (error) throw error;

        return res.status(200).json({ parts: data });
    } catch (error) {
        console.error('DB 오류:', error);
        return res.status(500).json({ error: 'DB 오류가 발생했습니다' });
    }
}
