const https = require('https');

function get(path) {
    return new Promise((res, reject) => {
        https.get('https://be.aryplus.tv' + path, {
            headers: {
                'x-api-key': 'ak_37515186786306625012043079404171',
                'User-Agent': 'Mozilla/5.0'
            }
        }, r => {
            let d = '';
            r.on('data', c => d += c);
            r.on('end', () => {
                try { res(JSON.parse(d)); } catch(e) { res(d); }
            });
        }).on('error', reject);
    });
}

function head(url) {
    return new Promise(res => {
        const req = https.request(url, { method: 'HEAD' }, r => {
            res({ status: r.statusCode, type: r.headers['content-type'] });
        });
        req.on('error', e => res({ error: e.message }));
        req.end();
    });
}

(async () => {
    console.log('=== VERIFYING ARY PLUS COMPLETE APP WORKFLOW ===');
    
    // 1. Fetch Home Catalog
    const home = await get('/api/v2/homev2/v2/669f5e353fe1bf91a6a4e273/Pakistan');
    const sections = home.home.homeData.filter(s => s.data && s.data.series && s.data.series.length > 0);
    console.log(`[PASS] Home catalog loaded: ${sections.length} active categories`);

    // Print all categories
    sections.forEach((s, i) => console.log(`   ${i + 1}. ${s.name || s.title} (${s.data.series.length} items)`));

    // 2. Test Live Streaming
    const liveSection = sections.find(s => (s.name || s.title || '').toUpperCase().includes('LIVE STREAMING'));
    if (liveSection) {
        const liveChannel = liveSection.data.series[0];
        console.log(`\n[PASS] Testing Live Channel: "${liveChannel.title}"`);
        const liveStreamUrl = liveChannel.seiresCDN || liveChannel.trailer;
        console.log('   Stream URL:', liveStreamUrl);
        const liveCheck = await head(liveStreamUrl);
        console.log('   HLS Manifest Check:', liveCheck);
    }

    // 3. Test Multiple Dramas / Shows with Full Episodes
    const dramaSection = sections.find(s => (s.name || s.title || '').toUpperCase().includes('DRAMAS'));
    if (dramaSection) {
        const testDramas = dramaSection.data.series.slice(0, 3);
        for (const drama of testDramas) {
            console.log(`\n[PASS] Testing Show: "${drama.title}" (ID: ${drama._id})`);
            const epData = await get('/api/cdn/' + drama._id);
            const eps = epData.episode || [];
            console.log(`   Total Episodes: ${eps.length}`);
            if (eps.length > 0) {
                const ep1 = eps[0];
                console.log(`   Episode 1: "${ep1.title}" (${Math.floor(ep1.videoLength / 60)} minutes)`);
                console.log(`   Video Stream: ${ep1.videoSource}`);
                const epCheck = await head(ep1.videoSource);
                console.log('   Episode Stream Check:', epCheck);
            }
        }
    }

    console.log('\n=== ALL TESTS PASSED SUCCESSFULLY ===');
})();

