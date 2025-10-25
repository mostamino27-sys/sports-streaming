import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    let browser = null;
    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        await page.goto('https://www.camel1.live/', { waitUntil: 'networkidle2', timeout: 30000 });

        const data = await page.evaluate(() => {
            const live = [], upcoming = [];
            document.querySelectorAll('[class*="match"]').forEach((card, idx) => {
                const teams = Array.from(card.querySelectorAll('[class*="team"]')).map(t => t.textContent.trim());
                if (teams.length >= 2) {
                    const match = {
                        id: idx + 1,
                        league: card.querySelector('[class*="league"]')?.textContent.trim() || 'دوري عام',
                        sport: 'football',
                        homeTeam: teams[0],
                        awayTeam: teams[1],
                        status: 'مباشر الآن',
                        url: card.querySelector('a')?.href || 'https://www.camel1.live/'
                    };
                    live.push(match);
                }
            });
            return { live, upcoming, results: [] };
        });

        await browser.close();
        return res.status(200).json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) {
        if (browser) await browser.close();
        return res.status(200).json({ success: false, error: error.message });
    }
}
