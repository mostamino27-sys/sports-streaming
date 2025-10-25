// api/matches.js
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export default async function handler(req, res) {
    // السماح بـ CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let browser = null;
    
    try {
        console.log('🚀 بدء استخراج البيانات من Camel Live...');
        
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        await page.goto('https://www.camel1.live/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        const data = await page.evaluate(() => {
            const live = [], upcoming = [], results = [];
            const cards = document.querySelectorAll('[class*="match"], [class*="card"], [class*="game"]');
            
            cards.forEach((card, idx) => {
                const text = card.textContent;
                const links = Array.from(card.querySelectorAll('a[href]'))
                    .map(a => ({ name: a.textContent.trim() || 'بث مباشر', url: a.href }))
                    .filter(l => !l.url.includes('javascript') && !l.url.startsWith('#'));
                
                const teams = Array.from(card.querySelectorAll('[class*="team"]'))
                    .map(t => t.textContent.trim())
                    .filter(t => t.length > 2);
                
                if (teams.length >= 2) {
                    const match = {
                        id: idx + 1,
                        league: card.querySelector('[class*="league"]')?.textContent.trim() || 'دوري عام',
                        sport: 'football',
                        homeTeam: teams[0],
                        awayTeam: teams[1],
                        status: text.includes('live') ? 'مباشر الآن' : 'قريباً',
                        streams: links.length > 0 ? links : [{ name: 'بث مباشر', url: 'https://www.camel1.live/' }]
                    };
                    
                    if (text.includes('live') || text.includes('مباشر')) {
                        live.push(match);
                    } else {
                        upcoming.push(match);
                    }
                }
            });
            
            return { live, upcoming, results };
        });

        await browser.close();
        
        console.log(`✅ نجح: ${data.live.length} مباشر, ${data.upcoming.length} قادمة`);
        
        return res.status(200).json({
            success: true,
            data,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ خطأ:', error.message);
        
        if (browser) await browser.close();
        
        return res.status(200).json({
            success: false,
            error: error.message,
             {
                live: [
                    { id: 1, league: 'الدوري الإنجليزي', sport: 'football', homeTeam: 'مانشستر سيتي', awayTeam: 'ليفربول', homeScore: 2, awayScore: 1, time: '67\'', status: 'مباشر الآن', streams: [{ name: 'بث مباشر', url: 'https://www.camel1.live/' }] }
                ],
                upcoming: [],
                results: []
            }
        });
    }
}
