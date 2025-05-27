require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

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

// Emoji per coin biar lebih menarik
const coinEmojis = {
  BTC: '🟠',
  ETH: '🔷',
  USDT: '💵',
  ALPACA: '🦙',
  HEDG: '🌿',
  PEPE: '🐸',
  MOODENG: '🌝',
  H2O: '💧'
};

// Threshold sederhana buat kasih emoji tren (bisa disesuaikan sesuai data real)
const thresholds = {
  BTC: { high: 1800000000, low: 1720000000 },
  ETH: { high: 44000000, low: 40000000 },
  USDT: { high: 17000, low: 15000 },
  ALPACA: { high: 2500, low: 1000 },
  HEDG: { high: 1500, low: 1000 },
  PEPE: { high: 0.25, low: 0.20 },
  MOODENG: { high: 4500, low: 3800 },
  H2O: { high: 6000, low: 5000 }
};

function getTrendEmoji(price, coin) {
  const { high, low } = thresholds[coin] || {};
  if (!high || !low) return '⚪️'; // no info

  if (price > high) return '🚀';
  if (price < low) return '🔻';
  return '➡️';
}

async function fetchPrices(channel) {
  const prices = {};

  for (const coin of coins) {
    try {
      const res = await axios.get(`https://indodax.com/api/${coin}/ticker`);
      prices[coin] = parseFloat(res.data.ticker.last);
    } catch (err) {
      console.error(`Gagal fetch harga ${coin}:`, err.message);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('🚨 Harga Crypto Terupdate dari Indodax 🚨')
    .setColor('#00bfff')
    .setDescription('Pantau pergerakan harga cryptocurrency favoritmu secara real-time!')
    .setFooter({ text: 'Data dari Indodax | Update tiap jam' })
    .setTimestamp();

  for (const [coinKey, price] of Object.entries(prices)) {
    const coin = coinKey.toUpperCase().replace('_IDR', '');
    const emoji = coinEmojis[coin] || '❓';
    const trend = getTrendEmoji(price, coin);

    const formattedPrice = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: coin === 'PEPE' ? 2 : 0
    }).format(price);

    embed.addFields({
      name: `${emoji} ${coin} ${trend}`,
      value: `${formattedPrice}`,
      inline: true
    });
  }

  await channel.send({ embeds: [embed] });
}

client.once('ready', async () => {
  console.log(`✅ Bot aktif sebagai ${client.user.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);

  if (!channel) {
    console.error('❌ Channel tidak ditemukan!');
    return;
  }

  await fetchPrices(channel);
  setInterval(() => fetchPrices(channel), 3600000); // update setiap 1 jam
});

client.login(TOKEN);
