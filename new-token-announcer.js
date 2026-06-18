const https = require('https');
const fs = require('fs');

const WEBHOOK_URL = process.env.WEBHOOK_URL;
if (!WEBHOOK_URL) {
  console.error("❌ WEBHOOK_URL tidak ditemukan di environment");
  process.exit(1);
}

let knownTokens = new Set();
const STATE_FILE = 'known-tokens.json';

if (fs.existsSync(STATE_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    knownTokens = new Set(data);
    console.log(`Loaded ${knownTokens.size} known tokens`);
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
    title: `🎉 Token Baru Listing di CROSS Chain!`,
    description: `**${token.symbol}**`,
    color: 0x00ff88,
    fields: [
      { name: "Game", value: token.game?.name || token.name || "Unknown", inline: true },
      { name: "Price", value: Number(token.stats?.last_price || 0).toFixed(6) + " CROSS", inline: true },
      { name: "Liquidity", value: Number(token.stats?.liquidity || 0).toFixed(2), inline: true },
      { name: "Contract", value: `\`${token.address ? token.address.substring(0,12) + '...' : 'N/A'}\``, inline: false }
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

    const req = https.request(options, res => {
      console.log(`✅ Dikirim ke Discord: ${token.symbol}`);
      resolve();
    });
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
        console.log(`🆕 Token baru ditemukan: ${token.symbol}`);
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
