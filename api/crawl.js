import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const CATEGORIES = [
    { name: 'CPU', divNo: '2604' },
    { name: '메모리', divNo: '2605' },
    { name: '메인보드', divNo: '2606' },
    { name: 'HDD/SSD', divNo: '2607' },
    { name: '그래픽카드', divNo: '2608' },
    { name: '파워/쿨러', divNo: '2610' },
    { name: '모니터', divNo: '' },
];

const BASE_URL = 'https://www.compuzone.co.kr/product/product_list.htm';

async function crawlCategory(category) {
    try {
        let url = `${BASE_URL}?actype=getTotalPageCount&BigDivNo=89&MediumDivNo=1126&DivNo=${category.divNo}&PageCount=100&StartNum=0&PageNum=1&PreOrder=sale_order&lvm=T&ProductType=list&select_page_cnt=100`;

        if (category.name === '모니터') {
            url = `${BASE_URL}?actype=getTotalPageCount&BigDivNo=89&MediumDivNo=1128&PageCount=100&StartNum=0&PageNum=1&PreOrder=sale_order&lvm=T&ProductType=list&select_page_cnt=100`;
        }

        const response = await fetch(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                Referer: 'https://www.compuzone.co.kr',
            },
        });

        const html = await response.text();
        const items = [];

        // 상품명 패턴
        const nameRegex = /class="prd_info_name[^"]*"[^>]*>([^<]+)</g;
        const priceRegex = /data-price="(\d+)"/g;

        const names = [];
        const prices = [];

        let match;
        while ((match = nameRegex.exec(html)) !== null) {
            names.push(match[1].trim());
        }
        while ((match = priceRegex.exec(html)) !== null) {
            prices.push(parseInt(match[1].replace(/,/g, '')));
        }

        for (let i = 0; i < Math.min(names.length, prices.length); i++) {
            if (names[i] && prices[i]) {
                items.push({
                    category: category.name,
                    name: names[i],
                    price: prices[i],
                    updated_at: new Date().toISOString(),
                });
            }
        }

        console.log(`${category.name}: ${items.length}개 파싱됨`);

        if (items.length > 0) {
            const { error } = await supabase.from('parts').upsert(items, { onConflict: 'name' });

            if (error) console.error('저장 오류:', error);
            else console.log(`${category.name}: ${items.length}개 저장완료`);
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
    const results = [];

    for (const category of CATEGORIES) {
        await crawlCategory(category);
        results.push(category.name);
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return res.status(200).json({
        message: '크롤링 완료!',
        categories: results,
    });
}
