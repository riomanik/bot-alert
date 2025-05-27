require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

function formatToRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

// async function checkPrice(channel) {
//   try {
//     const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=idr');
//     const priceIdr = data.bitcoin.idr;
//     const formatted = formatToRupiah(priceIdr);

//     console.log(`[LOG] Harga BTC: ${formatted}`);

//     if (priceIdr > 1800000000) {
//       await channel.send(`🚀 Harga BTC NAIK! Sekarang: ${formatted}`);
//     } else if (priceIdr <= 1720000000) {
//       await channel.send(`🔻 Harga BTC TURUN! Sekarang: ${formatted}`);
//     } else {
//       await channel.send(`📈 Harga BTC: ${formatted}`);
//     }

//   } catch (err) {
//     console.error('Gagal ambil harga:', err.message);
//   }
// }

const coins = [
  'btc_idr',
  'eth_idr',
  'usdt_idr',
  'alpaca_idr',
  'hedg_idr',
  'pepe_idr',
  'moodeng_idr',
  'h2o_idr'
];

async function fetchPrices() {
  const prices = {};

  for (const coin of coins) {
    try {
      const res = await axios.get(`https://indodax.com/api/${coin}/ticker`);
      prices[coin] = parseFloat(res.data.ticker.last);
    } catch (err) {
      console.error(`Gagal fetch harga ${coin}:`, err.message);
    }
  }

  let message = '📊 Harga crypto dari Indodax:\n';
  for (const [coin, price] of Object.entries(prices)) {
    message += `${coin.toUpperCase().replace('_IDR','')}: Rp${price.toLocaleString()}\n`;
  }
  await channel.send(message);
}

client.once('ready', async () => {
  console.log(`✅ Bot aktif sebagai ${client.user.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);

  if (!channel) {
    console.error('❌ Channel tidak ditemukan!');
    return;
  }

  await fetchPrices(channel);
  setInterval(() => fetchPrices(channel), 3600000);
});

client.login(TOKEN);
