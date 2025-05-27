require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

// Fungsi konversi USD ke IDR (rate kasar, bisa diganti dari API)
function convertUsdToIdr(usd) {
  const rate = 16000; // Asumsi 1 USD = Rp16.000
  return usd * rate;
}

// Fungsi format ke IDR
function formatToRupiah(amount) {
    console.log(`[PRICE: ${amount}`);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

client.once('ready', () => {
  console.log(`✅ Bot aktif sebagai ${client.user.tag}`);

  const channel = client.channels.cache.get(CHANNEL_ID);

  if (!channel) {
    console.error('❌ Channel tidak ditemukan!');
    return;
  }

  // Setiap 1 menit ambil harga BTC
  setInterval(async () => {
    try {
        const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=idr');
        console.log(`Harga IDR BTC: ${data.bitcoin.idr}`);  // ini baru benar
        
        const priceIdr = data.bitcoin.idr;
        
        // Kalau mau format ke rupiah langsung:
        const formatted = formatToRupiah(priceIdr);

      console.log(`[LOG] Harga BTC: ${formatted}`);
      // Kirim alert jika melewati batas
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
  }, 60000); // 60 detik
});

client.login(TOKEN);