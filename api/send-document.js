import formidable from 'formidable';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

// Отключаем стандартный парсер Vercel, чтобы обработать файл вручную
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // 1. Разрешаем CORS (это главное решение вашей ошибки!)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Обработка предварительного запроса от браузера
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, description: 'Только POST запросы' });
  }

  try {
    // 2. Читаем файл из запроса
    const form = formidable({ multiples: false });
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const botToken = req.query.token;
    const chat_id = fields.chat_id ? fields.chat_id[0] : '';
    const caption = fields.caption ? fields.caption[0] : '';
    const documentFile = files.document ? files.document[0] : null;

    if (!documentFile) {
      return res.status(400).json({ ok: false, description: 'Файл не найден в запросе' });
    }

    // 3. Отправляем в Telegram
    const formData = new FormData();
    formData.append('chat_id', chat_id);
    formData.append('document', fs.createReadStream(documentFile.filepath), documentFile.originalFilename);
    if (caption) formData.append('caption', caption);

    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendDocument`,
      formData,
      { headers: formData.getHeaders() }
    );

    // 4. Удаляем временный файл с сервера Vercel
    fs.unlinkSync(documentFile.filepath);

    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Ошибка Vercel:', error);
    return res.status(500).json({ 
      ok: false, 
      description: error.response?.data?.description || error.message 
    });
  }
}
