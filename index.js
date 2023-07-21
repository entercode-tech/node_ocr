// index.js
const express = require('express');
const { createWorker } = require('tesseract.js');
const dotenv = require('dotenv');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const worker = createWorker();

// Konfigurasi Tesseract.js dengan bahasa yang diinginkan (dalam contoh ini bahasa Inggris)
const TesseractConfig = {
  lang: process.env.TESSERACT_LANG || 'eng',
};

// Inisialisasi Express.js
app.use(express.json());
app.get('/', (req, res) => {
    res.send('Hello, World!');
  });
// Route untuk mengenali teks dari URL gambar
app.post('/recognize', async (req, res) => {
  const imageUrl = req.body.imageUrl;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Please provide an image URL' });
  }

  try {
    const imageBuffer = await downloadImage(imageUrl);

    // Simpan gambar sementara di folder uploads
    const imageFileName = path.basename(imageUrl);
    const imagePath = path.join(__dirname, 'uploads', imageFileName);

    // Gunakan metode asinkron untuk menyimpan gambar
    fs.writeFile(imagePath, imageBuffer, (err) => {
      if (err) {
        console.error('Error saving image:', err);
        return res.status(500).json({ error: 'Failed to save image' });
      }

      console.log(`Image saved at: ${imagePath}`);

      processImage(imagePath, res);
    });
  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: 'Failed to process image' });
  }
});

// Fungsi untuk mengunduh gambar dari URL
async function downloadImage(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return response.data;
  } catch (err) {
    throw new Error('Failed to download image');
  }
}

// Fungsi untuk memproses gambar dengan OCR
async function processImage(imagePath, res) {
  try {
    await worker.load();
    await worker.loadLanguage(TesseractConfig.lang);
    await worker.initialize(TesseractConfig.lang);

    // Proses OCR pada gambar yang telah disimpan
    const { data: { text } } = await worker.recognize(imagePath);
    console.log('Detected Text:', text);

    await worker.terminate();

    // Hapus gambar sementara setelah proses selesai
    fs.unlink(imagePath, (err) => {
      if (err) {
        console.error('Error deleting image:', err);
      }
    });

    return res.status(200).send(text);
  } catch (err) {
    console.error('Error processing image:', err);
    return res.status(500).json({ error: 'Failed to process image' });
  }
}

// Jalankan server
app.listen(port, () => {
  console.log(`Server is running on http://${process.env.HOST}:${port}`);
});
