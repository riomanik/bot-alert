require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require('discord.js');
const axios = require('axios');

// Inisialisasi client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const PREFIX = '!';

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

// === Utility Functions ===

function formatPrice(price, coin) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: coin === 'PEPE' ? 2 : 0
  }).format(price);
}

function getTrendEmoji(price, coin) {
  const { high, low } = thresholds[coin] || {};
  if (!high || !low) return '⚪️';
  if (price > high) return '🚀';
  if (price < low) return '🔻';
  return '➡️';
}

function normalizeCoinKey(input) {
  return input.toLowerCase().endsWith('_idr') ? input.toLowerCase() : input.toLowerCase() + '_idr';
}

// === Core Functions ===

async function fetchPrice(coinKeyRaw) {
  try {
    const res = await axios.get(`https://indodax.com/api/${coinKeyRaw}/ticker`);
    return parseFloat(res.data.ticker.last);
  } catch {
    return null;
  }
}

async function fetchCoinList() {
  try {
    const res = await axios.get('https://indodax.com/api/summaries');
    return Object.keys(res.data.tickers);
  } catch (err) {
    console.error('❌ Gagal fetch list coin:', err.message);
    return [];
  }
}

async function sendPriceList(channel) {
  const embed = new EmbedBuilder()
    .setTitle('🚨 Harga Crypto Terupdate dari Indodax 🚨')
    .setColor('#00bfff')
    .setDescription('Pantau pergerakan harga cryptocurrency favoritmu secara real-time!')
    .setFooter({ text: 'Data dari Indodax | Update tiap jam' })
    .setTimestamp();

  const coins = [
    'btc_idr', 'eth_idr', 'usdt_idr', 'alpaca_idr',
    'hedg_idr', 'pepe_idr', 'moodeng_idr', 'h2o_idr'
  ];

  for (const coinKey of coins) {
    const price = await fetchPrice(coinKey);
    if (!price) continue;

    const coin = coinKey.toUpperCase().replace('_IDR', '');
    const emoji = coinEmojis[coin] || '❓';
    const trend = getTrendEmoji(price, coin);
    const formattedPrice = formatPrice(price, coin);

    embed.addFields({
      name: `${emoji} ${coin} ${trend}`,
      value: formattedPrice,
      inline: true
    });
  }

  await channel.send({ embeds: [embed] });
}

async function handleCoinCommand(message, args) {
  if (!args.length) {
    return message.reply('❗ Ketik nama coin, contoh: `!coin btc`');
  }

  const coinKeyRaw = normalizeCoinKey(args[0]);
  const price = await fetchPrice(coinKeyRaw);

  if (!price) {
    return message.reply('❌ Gagal mengambil harga coin. Pastikan nama coin benar.');
  }

  const coin = coinKeyRaw.toUpperCase().replace('_IDR', '');
  const emoji = coinEmojis[coin] || '';
  const trend = getTrendEmoji(price, coin);
  const formattedPrice = formatPrice(price, coin);

  await message.reply(`${emoji} Harga ${coin} sekarang: ${formattedPrice} ${trend}`);
}

async function handleCoinListCommand(message) {
  const coinList = await fetchCoinList();
  if (coinList.length === 0) {
    return message.reply('❌ Gagal mengambil daftar coin dari Indodax.');
  }

  let page = 0;
  const pageSize = 20;
  const maxPage = Math.ceil(coinList.length / pageSize);

  const generateEmbed = (page) => {
    const start = page * pageSize;
    const chunk = coinList.slice(start, start + pageSize);
    const content = chunk.map(c => `🪙 ${c.replace('_idr', '').toUpperCase()}`).join('\n');

    return new EmbedBuilder()
      .setTitle(`📄 Daftar Coin Indodax (Halaman ${page + 1}/${maxPage})`)
      .setDescription(content)
      .setColor('#00bfff');
  };

  const generateButtons = () => {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('⬅️ Sebelumnya')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Berikutnya ➡️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page >= maxPage - 1)
    );
  };

  const msg = await message.reply({
    embeds: [generateEmbed(page)],
    components: [generateButtons()]
  });

  const collector = msg.createMessageComponentCollector({ time: 60000 });

  collector.on('collect', async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      return interaction.reply({ content: '❗ Hanya pengirim asli yang dapat mengontrol halaman ini.', ephemeral: true });
    }

    if (interaction.customId === 'next' && page < maxPage - 1) page++;
    if (interaction.customId === 'prev' && page > 0) page--;

    await interaction.update({
      embeds: [generateEmbed(page)],
      components: [generateButtons()]
    });
  });

  collector.on('end', async () => {
    await msg.edit({ components: [] });
  });
}

// === Main Bot Logic ===

client.once('ready', async () => {
  console.log(`✅ Bot aktif sebagai ${client.user.tag}`);
  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
  if (!channel) return console.error('❌ Channel tidak ditemukan!');

  await sendPriceList(channel);
  setInterval(() => sendPriceList(channel), 3600000);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'coin') {
    await handleCoinCommand(message, args);
  } else if (command === 'coinlist') {
    await handleCoinListCommand(message);
  }
});

client.login(TOKEN);
