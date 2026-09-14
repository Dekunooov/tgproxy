const express = require('express');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const upload = multer({ dest: uploadDir });

app.use(cors());
app.use(express.json());

app.post('/send-document', upload.single('document'), async (req, res) => {
  try {
    const { chat_id, caption } = req.body;
    const botToken = req.query.token;

    if (!req.file) {
      return res.status(400).json({ ok: false, description: 'Файл не загружен' });
    }

    const formData = new FormData();
    formData.append('chat_id', chat_id);
    formData.append('document', fs.createReadStream(req.file.path), req.file.originalname);
    if (caption) formData.append('caption', caption);

    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendDocument`,
      formData,
      { headers: formData.getHeaders() }
    );

    fs.unlinkSync(req.file.path);
    res.json(response.data);
  } catch (error) {
    console.error('Ошибка:', error.message);
    res.status(500).json({ 
      ok: false, 
      description: error.response?.data?.description || error.message 
    });
  }
});

app.get('/', (req, res) => {
  res.send('✅ Прокси работает!');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});
