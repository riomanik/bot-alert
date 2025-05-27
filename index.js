require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Events } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,  // perlu agar bisa baca message content
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

const thresholds = {
  BTC: { high: 1800000000, low: 1720000000, colorHigh: '#28a745', colorLow: '#dc3545', colorMid: '#ffc107' },
  ETH: { high: 44000000, low: 40000000, colorHigh: '#28a745', colorLow: '#dc3545', colorMid: '#ffc107' },
  USDT: { high: 17000, low: 15000, colorHigh: '#28a745', colorLow: '#dc3545', colorMid: '#ffc107' },
  ALPACA: { high: 2500, low: 1000, colorHigh: '#28a745', colorLow: '#dc3545', colorMid: '#ffc107' },
  HEDG: { high: 1500, low: 1000, colorHigh: '#28a745', colorLow: '#dc3545', colorMid: '#ffc107' },
  PEPE: { high: 0.25, low: 0.20, colorHigh: '#28a745', colorLow: '#dc3545', colorMid: '#ffc107' },
  MOODENG: { high: 4500, low: 3800, colorHigh: '#28a745', colorLow: '#dc3545', colorMid: '#ffc107' },
  H2O: { high: 6000, low: 5000, colorHigh: '#28a745', colorLow: '#dc3545', colorMid: '#ffc107' }
};

function getTrendEmoji(price, coin) {
  const { high, low } = thresholds[coin] || {};
  if (!high || !low) return '⚪️'; // no info

  if (price > high) return '🚀';
  if (price < low) return '🔻';
  return '➡️';
}

function getEmbedColor(prices) {
  const btcPrice = prices['btc_idr'];
  if (!btcPrice) return '#00bfff'; // default biru

  const { high, low, colorHigh, colorLow, colorMid } = thresholds['BTC'];
  if (btcPrice > high) return colorHigh;
  if (btcPrice < low) return colorLow;
  return colorMid;
}

async function fetchPrices() {
  const prices = {};
  await Promise.all(coins.map(async (coin) => {
    try {
      const res = await axios.get(`https://indodax.com/api/${coin}/ticker`);
      prices[coin] = parseFloat(res.data.ticker.last);
    } catch (err) {
      console.error(`Gagal fetch harga ${coin}:`, err.message);
      prices[coin] = null;
    }
  }));
  return prices;
}

async function sendPriceUpdate(channel) {
  const prices = await fetchPrices();
  const embedColor = getEmbedColor(prices);

  const embed = new EmbedBuilder()
    .setTitle('🚨 Harga Crypto Terupdate dari Indodax 🚨')
    .setColor(embedColor)
    .setDescription('Pantau pergerakan harga cryptocurrency favoritmu secara real-time!')
    .setFooter({ text: 'Data dari Indodax | Update tiap jam' })
    .setTimestamp();

  for (const [coinKey, price] of Object.entries(prices)) {
    const coin = coinKey.toUpperCase().replace('_IDR', '');
    const emoji = coinEmojis[coin] || '❓';
    const trend = price ? getTrendEmoji(price, coin) : '❌';

    const formattedPrice = price
      ? new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: coin === 'PEPE' ? 4 : 0,
          maximumFractionDigits: coin === 'PEPE' ? 4 : 0
        }).format(price)
      : 'Gagal ambil harga';

    embed.addFields({
      name: `${emoji} ${coin} ${trend}`,
      value: formattedPrice,
      inline: true
    });
  }

  await channel.send({ embeds: [embed] });
}

async function getSingleCoinPrice(coinKey) {
  const coinKeyLower = coinKey.toLowerCase();
  if (!coins.includes(`${coinKeyLower}_idr`)) {
    return null;
  }
  try {
    const res = await axios.get(`https://indodax.com/api/${coinKeyLower}_idr/ticker`);
    const price = parseFloat(res.data.ticker.last);
    return price;
  } catch {
    return null;
  }
}

client.once('ready', async () => {
  console.log(`✅ Bot aktif sebagai ${client.user.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
  if (!channel) {
    console.error('❌ Channel tidak ditemukan!');
    return;
  }

  await sendPriceUpdate(channel);
  setInterval(() => sendPriceUpdate(channel), 3600000);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  if (command === 'price') {
    if (args.length === 0) {
      return message.reply('Tolong ketik nama coin, contoh: `!price btc`');
    }

    const coinKey = args[0].toLowerCase();

    if (!coins.includes(`${coinKey}_idr`)) {
      return message.reply('Coin tidak ditemukan, coba btc, eth, usdt, dll');
    }

    const price = await getSingleCoinPrice(coinKey);

    if (!price) {
      return message.reply(`Gagal mengambil harga untuk ${coinKey.toUpperCase()}`);
    }

    const formattedPrice = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: coinKey === 'pepe' ? 4 : 0,
      maximumFractionDigits: coinKey === 'pepe' ? 4 : 0
    }).format(price);

    const emoji = coinEmojis[coinKey.toUpperCase()] || '❓';
    const trend = getTrendEmoji(price, coinKey.toUpperCase());

    // Kirim embed sederhana untuk command
    const embed = new EmbedBuilder()
      .setTitle(`${emoji} Harga ${coinKey.toUpperCase()}`)
      .setDescription(`${formattedPrice} ${trend}`)
      .setColor('#00bfff')
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
});

client.login(TOKEN);
