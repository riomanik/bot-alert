require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Events } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const PREFIX = '!';

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
  setInterval(() => fetchPrices(channel), 3600000); // update tiap jam
});

// Fungsi ambil list coin dari Indodax
async function getCoinList() {
  try {
    const res = await axios.get('https://indodax.com/api/summaries');
    const tickers = res.data.tickers; // response langsung object tickers
    const coins = Object.keys(tickers); // ['btc_idr', 'eth_idr', ...]
    return coins;
  } catch (err) {
    console.error('Gagal ambil list coin:', err.message);
    return [];
  }
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'coin') {
    if (!args.length) {
      return message.reply('Tolong ketik nama coin, misal: !price btc');
    }

    const coinKeyRaw = args[0].toLowerCase();
    // Map input ke nama coins array, contoh: btc -> btc_idr
    const coinKey = coins.find(c => c.startsWith(coinKeyRaw));
    if (!coinKey) {
      return message.reply('Coin tidak ditemukan, coba btc, eth, usdt, dll');
    }

    try {
      const res = await axios.get(`https://indodax.com/api/${coinKey}/ticker`);
      const price = parseFloat(res.data.ticker.last);
      const coin = coinKey.toUpperCase().replace('_IDR', '');
      const formattedPrice = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: coin === 'PEPE' ? 2 : 0
      }).format(price);

      const emoji = coinEmojis[coin] || '';
      const trend = getTrendEmoji(price, coin);

      await message.reply(`${emoji} Harga ${coin} sekarang: ${formattedPrice} ${trend}`);
    } catch {
      await message.reply('Gagal mengambil harga, coba lagi nanti.');
    }
  }

  if (command === 'coinlist') {
    const coinsList = await getCoinList();
    if (coinsList.length === 0) {
      return message.reply('Gagal mengambil daftar coin dari Indodax.');
    }
  
    const chunkSize = 50; // Jumlah coin per pesan
    const chunks = [];
  
    for (let i = 0; i < coinsList.length; i += chunkSize) {
      const chunk = coinsList.slice(i, i + chunkSize);
      let listMessage = chunk.map(c => `🪙 ${c.replace('_idr', '').toUpperCase()}`).join('\n');
      chunks.push(listMessage);
    }
  
    await message.reply('Berikut adalah daftar coin yang tersedia di Indodax:');
  
    for (const chunk of chunks) {
      await message.channel.send(chunk);
    }
  }
  
});

client.login(TOKEN);
