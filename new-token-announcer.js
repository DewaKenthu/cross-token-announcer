const https = require('https');
const fs = require('fs');

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1517006226259447920/CII_Q70qIBfbGBzeky_B-f-yXInjHeRUXhjA_lwBb7_2G-8zv5PcDxz0j9GlhxW6gPt_'; // GANTI INI!

let knownTokens = new Set();
const STATE_FILE = 'known-tokens.json';

if (fs.existsSync(STATE_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    knownTokens = new Set(data);
  } catch (e) {}
}

async function fetchTokens() {
  return new Promise((resolve, reject) => {
    https.get('https://game-swap-api.cross.nexus/v1/tokens', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.items || json || []);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function sendToDiscord(token) {
  const embed = {
    title: `🎉 Token Baru di CROSS Chain!`,
    description: `**${token.symbol || token.name}**`,
    color: 0x00ff88,
    fields: [
      { name: "Game", value: token.game?.name || "Unknown", inline: true },
      { name: "Price", value: Number(token.stats?.last_price || 0).toFixed(6) + " CROSS", inline: true },
      { name: "Liquidity", value: Number(token.stats?.liquidity || 0).toFixed(2), inline: true },
      { name: "Contract", value: `\`${token.address?.slice(0,8)}...\``, inline: false }
    ],
    timestamp: new Date().toISOString(),
    footer: { text: "CROSS GameToken Auto Announcer" }
  };

  const payload = JSON.stringify({ embeds: [embed] });

  const url = new URL(WEBHOOK_URL);
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, () => resolve());
    req.on('error', console.error);
    req.write(payload);
    req.end();
  });
}

async function main() {
  try {
    console.log(`[${new Date().toISOString()}] Cek token baru...`);
    const tokens = await fetchTokens();
    let newCount = 0;

    for (const token of tokens) {
      if (token.symbol && !knownTokens.has(token.symbol)) {
        console.log(`🆕 Token baru: ${token.symbol}`);
        await sendToDiscord(token);
        knownTokens.add(token.symbol);
        newCount++;
      }
    }

    fs.writeFileSync(STATE_FILE, JSON.stringify([...knownTokens], null, 2));
    console.log(`Selesai. ${newCount} token baru diumumkan.`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
