const https = require('https');

const overpassUrl = 'https://overpass-api.de/api/interpreter?data=[out:json];node(around:5000,22.560,72.940)[amenity=hospital];out;';

https.get(overpassUrl, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const parsed = JSON.parse(data);
        const hospitals = parsed.elements.map(e => ({
            name: e.tags.name || 'Unknown Hospital',
            lat: e.lat,
            lon: e.lon
        })).filter(h => h.name !== 'Unknown Hospital');
        console.log(JSON.stringify(hospitals.slice(0, 8), null, 2));
    });
}).on('error', err => console.error(err));
