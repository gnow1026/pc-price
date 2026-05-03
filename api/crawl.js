import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

function cleanName(name) {
    return name
        .replace(/\[[^\]]{1,30}\]/g, '')
        .replace(/\([^)]{20,}\)/g, '')
        .replace(/[◆★●■▶]/g, '')
        .replace(/[0-9]+세대\s*/g, '')
        .replace(
            /\s*(하스웰|커피레이크R?|스카이레이크|카비레이크R?|아이비브릿지|샌디브릿지|랩터레이크R?|엘더레이크|로켓레이크|코멧레이크|애로우레이크)\s*/gi,
            ' ',
        )
        .replace(/\.{2,}/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

const CATEGORIES = [
    { name: 'CPU', divNo: '2604', mediumDivNo: '1126' },
    { name: '메모리', divNo: '2605', mediumDivNo: '1126' },
    { name: '메인보드', divNo: '2606', mediumDivNo: '1126' },
    { name: 'HDD/SSD', divNo: '2607', mediumDivNo: '1126' },
    { name: '그래픽카드', divNo: '2608', mediumDivNo: '1126' },
    { name: '파워/쿨러', divNo: '2610', mediumDivNo: '1126' },
    { name: '서버/네트워크', divNo: '', mediumDivNo: '1125' },
    { name: '노트북', divNo: '', mediumDivNo: '1455' },
    { name: '모니터/프린터', divNo: '', mediumDivNo: '1128' },
];

async function crawlCategory(category) {
    let scrollPage = 1;
    let totalSaved = 0;

    while (true) {
        try {
            const params = new URLSearchParams({
                actype: 'getList',
                SelectProductNo: '',
                orderlayerx: '',
                orderlayery: '',
                BigDivNo: '89',
                MediumDivNo: category.mediumDivNo,
                DivNo: category.divNo,
                PageCount: '100',
                StartNum: '0',
                PageNum: '1',
                PreOrder: 'sale_order',
                lvm: 'T',
                hot_keyword: '',
                left_menu_open: '',
                ps_po: 'P',
                DetailBack: '',
                CompareProductNoList: '',
                CompareProductDivNo: '',
                IsProductGroupView: '',
                ScrollPage: String(scrollPage),
                ProductType: 'list',
                setPricechk: 'N',
                MD_CopyCategory: 'N',
                BD_CopyCategory: 'N',
                OAuthCertChk: '0',
                PageType: 'ProductList',
                splist_kw: '',
                select_page_cnt: '100',
                BottomQuery: '',
            });

            const response = await fetch('https://www.compuzone.co.kr/product/product_list.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    Referer: `https://www.compuzone.co.kr/product/product_list.htm?BigDivNo=89&MediumDivNo=${category.mediumDivNo}&DivNo=${category.divNo}`,
                    'X-Requested-With': 'XMLHttpRequest',
                    Origin: 'https://www.compuzone.co.kr',
                    Accept: 'text/html, */*; q=0.01',
                    'Accept-Language': 'ko-KR,ko;q=0.9',
                    Cookie: process.env.COMPUZONE_COOKIE || '',
                },
                body: params.toString(),
            });

            const buffer = await response.arrayBuffer();
            const decoder = new TextDecoder('euc-kr');
            const html = decoder.decode(buffer);

            if (html.includes('noResult') || html.includes('Error Message') || html.trim() === '') {
                console.log(`${category.name} 스크롤${scrollPage}: 데이터 없음 → 종료`);
                break;
            }

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

            if (names.length === 0) {
                console.log(`${category.name} 스크롤${scrollPage}: 파싱 결과 없음 → 종료`);
                break;
            }

            console.log(`${category.name} 스크롤${scrollPage}: ${names.length}개`);

            const items = [];
            const seenNames = new Set();
            for (let i = 0; i < Math.min(names.length, prices.length); i++) {
                if (names[i] && prices[i] && !seenNames.has(names[i])) {
                    seenNames.add(names[i]);
                    items.push({
                        category: category.name,
                        name: names[i],
                        clean_name: cleanName(names[i]),
                        price: prices[i],
                        updated_at: new Date().toISOString(),
                    });
                }
            }

            if (items.length > 0) {
                const { error } = await supabase.from('parts').upsert(items, { onConflict: 'name' });
                if (error) {
                    console.error('저장 오류:', error.message);
                } else {
                    totalSaved += items.length;
                    console.log(`${category.name} 스크롤${scrollPage}: ${items.length}개 저장 (누적 ${totalSaved}개)`);
                }
            }

            scrollPage++;
            await new Promise((r) => setTimeout(r, 500));
        } catch (error) {
            console.error(`${category.name} 오류:`, error.message);
            break;
        }
    }

    console.log(`${category.name} 완료: 총 ${totalSaved}개 저장`);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const cookie = process.env.COMPUZONE_COOKIE || '';
    if (!cookie) {
        return res.status(500).json({ error: '쿠키가 설정되지 않았습니다' });
    }

    let categoryName;
    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        categoryName = body?.categoryName;
    } catch (e) {
        categoryName = null;
    }

    const category = categoryName ? CATEGORIES.find((c) => c.name === categoryName) : CATEGORIES[0];

    if (!category) {
        return res.status(400).json({ error: `카테고리를 찾을 수 없습니다: ${categoryName}` });
    }

    console.log(`${category.name} 크롤링 시작...`);
    await crawlCategory(category);

    return res.status(200).json({
        message: `${category.name} 크롤링 완료!`,
    });
}
