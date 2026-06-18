const https = require('https');
const fs = require('fs');

const WEBHOOK_URL = "https://discord.com/api/webhooks/1517006226259447920/CII_Q70qIBfbGBzeky_B-f-yXInjHeRUXhjA_lwBb7_2G-8zv5PcDxz0j9GlhxW6gPt_"; // ← GANTI DENGAN WEBHOOK LU

async function fetchTokens() {
  const res = await fetch('https://game-swap-api.cross.nexus/v1/tokens');
  const data = await res.json();
  return data.items || data;
}

async function sendDiscord(token) {
  const embed = {
    title: `🎉 TEST TOKEN BARU - ${token.symbol}`,
    description: "Ini cuma test announcement",
    color: 0x00ff00,
    fields: [
      { name: "Symbol", value: token.symbol, inline: true },
      { name: "Contract", value: token.address ? token.address.substring(0,10) + "..." : "N/A", inline: true }
    ]
  };

  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] })
  });
}

fetchTokens()
  .then(tokens => {
    const firstToken = tokens[0];   // ambil token pertama buat test
    if (firstToken) {
      console.log("Mengirim test ke Discord...");
      sendDiscord(firstToken);
      console.log("✅ Test dikirim!");
    }
  })
  .catch(err => console.error(err));
