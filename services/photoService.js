// services/photoService.js
const { models } = require("../models/index");
const { OrderPhotoLinks } = models;
const s3 = require("../s3Config");

const handleOrderPhotos = async (allPhotos, parentId, transaction) => {
  if (!parentId) {
    throw new Error("parentId обязателен!");
  }

  if (!Array.isArray(allPhotos) || allPhotos.length === 0) {
    return;
  }

  const photoRecords = allPhotos.map((photo) => ({
    parentId,
    url: photo.url,
    fileKey: photo.key,
    description: photo.description || null,
    type: photo.type || null,
  }));

  try {
    await OrderPhotoLinks.bulkCreate(photoRecords, { transaction });
  } catch (error) {
    throw error;
  }
};

async function deleteFileFromS3(fileKey) {
  try {
    const params = { Bucket: process.env.S3_BUCKET_NAME, Key: fileKey };
    await s3.deleteObject(params).promise();
  } catch (error) {
    console.error(`❌ Ошибка при удалении файла ${fileKey}:`, error.message);
  }
}

async function deleteOrderPhotos(orderId, transaction) {
  const orderPhotos = await OrderPhotoLinks.findAll({
    where: { parentId: orderId },
    transaction,
  });
  await Promise.all(
    orderPhotos.map(async (photo) => deleteFileFromS3(photo.fileKey))
  );
  await OrderPhotoLinks.destroy({ where: { parentId: orderId }, transaction });
}

module.exports = { handleOrderPhotos, deleteFileFromS3, deleteOrderPhotos };
