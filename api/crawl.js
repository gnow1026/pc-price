import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const CATEGORIES = [
    { name: 'CPU', bigDivNo: '1' },
    { name: 'GPU', bigDivNo: '2' },
    { name: 'RAM', bigDivNo: '3' },
    { name: 'SSD', bigDivNo: '4' },
    { name: 'HDD', bigDivNo: '5' },
    { name: '메인보드', bigDivNo: '6' },
];

async function crawlCategory(category) {
    try {
        const response = await fetch(
            `https://www.compuzone.co.kr/product/productB_new_list.htm?BigDivNo=89&MediumDivNo=${category.bigDivNo}&display_cnt=60`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            },
        );

        const html = await response.text();

        const items = [];
        const regex = /class="prdname"[^>]*>([^<]+)<\/a>[\s\S]*?class="price"[^>]*>([\d,]+)원/g;
        let match;

        while ((match = regex.exec(html)) !== null) {
            const name = match[1].trim();
            const price = parseInt(match[2].replace(/,/g, ''));

            if (name && price) {
                items.push({
                    category: category.name,
                    name,
                    price,
                    updated_at: new Date().toISOString(),
                });
            }
        }

        if (items.length > 0) {
            await supabase.from('parts').upsert(items, { onConflict: 'name' });

            console.log(`${category.name}: ${items.length}개 저장완료`);
        }
    } catch (error) {
        console.error(`${category.name} 크롤링 오류:`, error);
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('크롤링 시작...');

    for (const category of CATEGORIES) {
        await crawlCategory(category);
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return res.status(200).json({ message: '크롤링 완료!' });
}
