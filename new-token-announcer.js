const https = require('https');
const fs = require('fs');

const WEBHOOK_URL = "https://discord.com/api/webhooks/1517006226259447920/CII_Q70qIBfbGBzeky_B-f-yXInjHeRUXhjA_lwBb7_2G-8zv5PcDxz0j9GlhxW6gPt_"; // GANTI INI

let knownTokens = new Set();
const STATE_FILE = 'known-tokens.json';

if (fs.existsSync(STATE_FILE)) {
  try {
    knownTokens = new Set(JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')));
    console.log(`Loaded ${knownTokens.size} known tokens`);
  } catch (e) {
    console.log("State file corrupted, starting fresh");
  }
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject)
      .setTimeout(10000, () => { // timeout 10 detik
        reject(new Error('Request timeout'));
      });
  });
}

async function sendToDiscord(token) {
  const embed = {
    title: `🎉 Token Baru Listing di CROSS Chain!`,
    description: `**${token.symbol}**`,
    color: 0x00ff88,
    fields: [
      { name: "Game", value: token.game?.name || "Unknown", inline: true },
      { name: "Price", value: Number(token.stats?.last_price || 0).toFixed(6) + " CROSS", inline: true },
      { name: "Liquidity", value: Number(token.stats?.liquidity || 0).toFixed(2), inline: true }
    ],
    timestamp: new Date().toISOString(),
    footer: { text: "CROSS GameToken Auto Announcer" }
  };

  const payload = JSON.stringify({ embeds: [embed] });

  return new Promise((resolve) => {
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

    const req = https.request(options, () => resolve());
    req.on('error', console.error);
    req.write(payload);
    req.end();
  });
}

async function main() {
  try {
    console.log(`[${new Date().toISOString()}] Checking new tokens...`);
    
    const data = await httpsGet('https://game-swap-api.cross.nexus/v1/tokens');
    const tokens = data.items || data || [];
    
    console.log(`Total tokens fetched: ${tokens.length}`);

    let newCount = 0;

    for (const token of tokens) {
      if (token.symbol && !knownTokens.has(token.symbol)) {
        console.log(`🆕 New token: ${token.symbol}`);
        await sendToDiscord(token);
        knownTokens.add(token.symbol);
        newCount++;
      }
    }

    fs.writeFileSync(STATE_FILE, JSON.stringify([...knownTokens], null, 2));
    console.log(`Done. ${newCount} new token(s) announced.`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main().finally(() => {
  console.log("Script finished.");
  process.exit(0);   // Paksa keluar biar tidak hang
});
