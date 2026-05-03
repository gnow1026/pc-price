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

const HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9',
};

function parseCookies(response, existingCookies = {}) {
    const setCookie = response.headers.get('set-cookie');
    if (!setCookie) return existingCookies;

    const cookies = { ...existingCookies };
    setCookie.split(',').forEach((cookie) => {
        const parts = cookie.trim().split(';')[0].split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            cookies[key] = value;
        }
    });
    return cookies;
}

function cookiesToString(cookies) {
    return Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
}

async function buildSession() {
    let cookies = {};

    console.log('1. 메인페이지 접속...');
    const main = await fetch('https://www.compuzone.co.kr', {
        headers: HEADERS,
    });
    cookies = parseCookies(main, cookies);
    console.log('메인 쿠키:', Object.keys(cookies).join(', '));

    await new Promise((r) => setTimeout(r, 1000));

    console.log('2. 중고 카테고리 접속...');
    const used = await fetch('https://www.compuzone.co.kr/product/product_list.htm?BigDivNo=89', {
        headers: {
            ...HEADERS,
            Cookie: cookiesToString(cookies),
            Referer: 'https://www.compuzone.co.kr',
        },
    });
    cookies = parseCookies(used, cookies);
    console.log('중고 쿠키:', Object.keys(cookies).join(', '));

    await new Promise((r) => setTimeout(r, 1000));

    console.log('3. CPU 카테고리 접속...');
    const cpu = await fetch(
        'https://www.compuzone.co.kr/product/product_list.htm?BigDivNo=89&MediumDivNo=1126&DivNo=2604',
        {
            headers: {
                ...HEADERS,
                Cookie: cookiesToString(cookies),
                Referer: 'https://www.compuzone.co.kr/product/product_list.htm?BigDivNo=89',
            },
        },
    );
    cookies = parseCookies(cpu, cookies);
    console.log('최종 쿠키:', Object.keys(cookies).join(', '));

    return cookies;
}

async function crawlCategory(category, cookies) {
    try {
        const params = new URLSearchParams({
            actype: 'getList',
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
                ...HEADERS,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                Referer: `https://www.compuzone.co.kr/product/product_list.htm?BigDivNo=89&MediumDivNo=1126&DivNo=${category.divNo}`,
                'X-Requested-With': 'XMLHttpRequest',
                Origin: 'https://www.compuzone.co.kr',
                Cookie: cookiesToString(cookies),
            },
            body: params.toString(),
        });

        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('euc-kr');
        const html = decoder.decode(buffer);
        console.log(`${category.name} HTML 앞부분:`, html.substring(0, 150));

        const names = [];
        const prices = [];
        const nameRegex = /class="prd_info_name prdTxt"[^>]*>([^<]+)</g;
        const priceRegex = /data-price="([\d,]+)"/g;

        let match;
        while ((match = nameRegex.exec(html)) !== null) {
            const name = match[1].trim();
            if (name) names.push(name);
        }
        while ((match = priceRegex.exec(html)) !== null) {
            prices.push(parseInt(match[1].replace(/,/g, '')));
        }

        console.log(`${category.name}: 이름 ${names.length}개, 가격 ${prices.length}개`);

        const items = [];
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
        }
    } catch (error) {
        console.error(`${category.name} 오류:`, error.message);
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('크롤링 시작...');

    const cookies = await buildSession();
    const results = [];

    for (const category of CATEGORIES) {
        await crawlCategory(category, cookies);
        results.push(category.name);
        await new Promise((r) => setTimeout(r, 2000));
    }

    return res.status(200).json({
        message: '크롤링 완료!',
        categories: results,
    });
}
