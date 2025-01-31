const express = require("express");
const multer = require("multer");
const s3 = require("../s3Config");
const mysql = require("mysql2/promise");
require("dotenv").config();

const router = express.Router();

// Настройка multer для обработки файлов
// Используем upload.array вместо upload.single
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.array("files"), async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "Файлы не найдены" });
    }

    // Подключение к базе данных
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const uploadedFiles = [];

    // Перебор всех файлов
    for (const file of files) {
      // Загрузка каждого файла на S3
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `uploads/${Date.now()}_${file.originalname}`, // Уникальное имя файла
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: "public-read", // Доступ к файлу
      };

      const uploadResult = await s3.upload(params).promise();
      console.log("Файл загружен на S3:", uploadResult.Location);

      // Сохранение ссылки в базе данных
      await connection.execute(
        "INSERT INTO files (file_name, file_url) VALUES (?, ?)",
        [file.originalname, uploadResult.Location]
      );

      // Добавляем результат в массив
      uploadedFiles.push({
        fileName: file.originalname,
        fileUrl: uploadResult.Location,
      });
    }

    await connection.end();

    res.status(200).json({
      message: "Файлы успешно загружены",
      files: uploadedFiles, // Возвращаем массив загруженных файлов
    });
  } catch (error) {
    console.error("Ошибка при загрузке файлов:", error);
    res.status(500).json({ message: "Ошибка при загрузке файлов" });
  }
});

module.exports = router;
