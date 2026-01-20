import fs from 'fs';
import https from 'https';

// Read API URL from environment variable or command line argument
const url = process.env.VITE_API_BASE
    ? `${process.env.VITE_API_BASE}/list`
    : process.argv[2]
        ? `${process.argv[2]}/list`
        : null;

if (!url) {
    console.error('Error: No API URL provided.');
    console.error('Usage: node download-music-index.js <API_BASE_URL>');
    console.error('Or set VITE_API_BASE environment variable');
    process.exit(1);
}

const outputPath = 'downloaded_index.json';

console.log(`Fetching from: ${url}`);

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const jsonData = JSON.parse(data);
            console.log('Successfully fetched and parsed JSON');
            console.log('Total songs:', jsonData.length);
            if (jsonData.length > 0) {
                console.log('Sample entry:', JSON.stringify(jsonData[0], null, 2));
            }
            fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
            console.log(`Saved to ${outputPath}`);
        } catch (e) {
            console.error('Error parsing JSON:', e.message);
            console.log('Raw data preview:', data.substring(0, 200));
        }
    });

}).on('error', (err) => {
    console.error('Error fetching data:', err.message);
});
