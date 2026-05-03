import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const CATEGORIES = [
    { name: 'CPU', divNo: '2604' },
    { name: '메모리', divNo: '2605' },
    { name: '메인보드', divNo: '2606' },
    { name: 'HDD/SSD', divNo: '2607' },
    { name: '그래픽카드', divNo: '2608' },
    { name: '파워/쿨러', divNo: '2610' },
];

async function crawlCategory(category) {
    try {
        const params = new URLSearchParams({
            actype: 'getTotalPageCount',
            SelectProductNo: '',
            BigDivNo: '89',
            MediumDivNo: '1126',
            DivNo: category.divNo,
            PageCount: '100',
            StartNum: '0',
            PageNum: '1',
            PreOrder: 'sale_order',
            lvm: 'T',
            hot_keyword: '',
            ps_po: 'P',
            ProductType: 'list',
            setPricechk: 'N',
            MD_CopyCategory: 'N',
            BD_CopyCategory: 'N',
            OAuthCertChk: '0',
            PageType: 'ProductList',
            select_page_cnt: '100',
        });

        const response = await fetch('https://www.compuzone.co.kr/product/product_list.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                Referer: 'https://www.compuzone.co.kr',
                Accept: 'text/html, */*; q=0.01',
                'Accept-Language': 'ko-KR,ko;q=0.9',
            },
            body: params.toString(),
        });

        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('euc-kr');
        const html = decoder.decode(buffer);
        console.log('HTML 앞부분:', html.substring(0, 500));

        const items = [];
        const nameRegex = /class="prd_info_name[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/g;
        const priceRegex = /data-price="(\d+)"/g;

        const names = [];
        const prices = [];

        let match;
        while ((match = nameRegex.exec(html)) !== null) {
            const name = match[1].trim();
            if (name) names.push(name);
        }
        while ((match = priceRegex.exec(html)) !== null) {
            prices.push(parseInt(match[1]));
        }

        console.log(`${category.name}: 이름 ${names.length}개, 가격 ${prices.length}개 파싱됨`);

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

        if (items.length > 0) {
            const { error } = await supabase.from('parts').upsert(items, { onConflict: 'name' });

            if (error) console.error('저장 오류:', error);
            else console.log(`${category.name}: ${items.length}개 저장완료`);
        } else {
            console.log(`${category.name}: 저장할 데이터 없음`);
        }
    } catch (error) {
        console.error(`${category.name} 크롤링 오류:`, error);
        console.error('스택:', error.stack);
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
