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

async function checkPrice(channel) {
  try {
    const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=idr');
    const priceIdr = data.bitcoin.idr;
    const formatted = formatToRupiah(priceIdr);

    console.log(`[LOG] Harga BTC: ${formatted}`);

    if (priceIdr > 1800000000) {
      await channel.send(`🚀 Harga BTC NAIK! Sekarang: ${formatted}`);
    } else if (priceIdr <= 1720000000) {
      await channel.send(`🔻 Harga BTC TURUN! Sekarang: ${formatted}`);
    } else {
      await channel.send(`📈 Harga BTC: ${formatted}`);
    }

  } catch (err) {
    console.error('Gagal ambil harga:', err.message);
  }
}

client.once('ready', async () => {
  console.log(`✅ Bot aktif sebagai ${client.user.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);

  if (!channel) {
    console.error('❌ Channel tidak ditemukan!');
    return;
  }

  await checkPrice(channel);

  setInterval(() => checkPrice(channel), 3600000);
});

client.login(TOKEN);
