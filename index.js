require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

    let coinKeyRaw = args[0].toLowerCase();
    if (!coinKeyRaw.endsWith('_idr')) {
      coinKeyRaw += '_idr';
    }
    // Map input ke nama coins array, contoh: btc -> btc_idr
    // const coinKey = coins.find(c => c.startsWith(coinKeyRaw));
    // if (!coinKey) {
    //   return message.reply('Coin tidak ditemukan, coba btc, eth, usdt, dll');
    // }

    try {
      const res = await axios.get(`https://indodax.com/api/${coinKeyRaw}/ticker`);
      console.log(`Gagal fetch harga ${coinKeyRaw}: https://indodax.com/api/${coinKeyRaw}/ticker `);
      const price = parseFloat(res.data.ticker.last);
      const coin = coinKeyRaw.toUpperCase().replace('_IDR', '');
      const formattedPrice = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: coin === 'PEPE' ? 2 : 0
      }).format(price);

      const emoji = coinEmojis[coin] || '';
      const trend = getTrendEmoji(price, coin);

      await message.reply(`${emoji} Harga ${coin} sekarang: ${formattedPrice} ${trend}`);
    } catch {
      console.log(`Gagal fetch harga ${coinKeyRaw}: https://indodax.com/api/${coinKeyRaw}/ticker `);
      await message.reply('Gagal mengambil harga, coba lagi nanti.');
    }
  }

  if (command === 'coinlist') {const coinsList = await getCoinList();
    if (coinsList.length === 0) {
      return message.reply('Gagal mengambil daftar coin dari Indodax.');
    }
  
    let page = 0;
    const pageSize = 20;
    const maxPage = Math.ceil(coinsList.length / pageSize);
  
    const generatePageEmbed = (page) => {
      const start = page * pageSize;
      const chunk = coinsList.slice(start, start + pageSize);
      const content = chunk.map(c => `🪙 ${c.replace('_idr', '').toUpperCase()}`).join('\n');
  
      return new EmbedBuilder()
        .setTitle(`📄 Daftar Coin Indodax (Halaman ${page + 1}/${maxPage})`)
        .setDescription(content)
        .setColor('#00bfff');
    };
  
    const getButtons = () => {
      const prevButton = new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('⬅️ Sebelumnya')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0); // disable jika halaman pertama
  
      const nextButton = new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Berikutnya ➡️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === maxPage - 1); // disable jika halaman terakhir
  
      return new ActionRowBuilder().addComponents(prevButton, nextButton);
    };
  
    const msg = await message.reply({
      embeds: [generatePageEmbed(page)],
      components: [getButtons()]
    });
  
    const collector = msg.createMessageComponentCollector({ time: 60000 });
  
    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: 'Command ini hanya untuk pengirim aslinya.', ephemeral: true });
      }
  
      if (interaction.customId === 'next') {
        if (page < maxPage - 1) page++;
      } else if (interaction.customId === 'prev') {
        if (page > 0) page--;
      }
  
      await interaction.update({
        embeds: [generatePageEmbed(page)],
        components: [getButtons()]
      });
    });
  
    collector.on('end', async () => {
      await msg.edit({ components: [] });
    });
  }
  
});

client.login(TOKEN);
