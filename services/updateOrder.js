const { v4: uuidv4 } = require("uuid");
const { Orders, OrderPhotoLinks } = require("../models/index").models;
const { deleteFileFromS3 } = require("./photoService");
const { handleOrderMaterials } = require("../services/materialService"); // або як у вас імпортується
const { sendOrderUpdateMessage } = require("../services/notificationService");
const {
  handleOrderDeads,
  handleOrderServices,
  handleOrderWorks,
} = require("./otherInfoOrder");
async function getNewUploadedFiles(rowsPhotos) {
  const result = [];
  if (!rowsPhotos) return result;

  const allPhotos = [
    ...(rowsPhotos.carvings || []),
    ...(rowsPhotos.artistic || []),
  ];
  for (const photo of allPhotos) {
    if (photo?.key) {
      result.push(photo.key);
    }
  }
  return result;
}

async function deleteRelatedData(parentId, transaction) {
  // Ваш код видалення пов'язаних даних
}

async function processPhotos(id, rowsPhotos, oldPhotos) {
  // Окрема транзакція (опційно) для роботи з фото
  // Якщо потрібна “атомарність” з оновленням замовлення — робіть у загальному блоку
  const photoTransaction = await Orders.sequelize.transaction();
  try {
    const newPhotos = [
      ...(rowsPhotos.carvings || []),
      ...(rowsPhotos.artistic || []),
    ];
    const newPhotoIdsSet = new Set(newPhotos.map((p) => p.id).filter(Boolean));

    const photosToDelete = oldPhotos.filter((p) => !newPhotoIdsSet.has(p.id));
    for (const photo of photosToDelete) {
      if (photo.fileKey) await deleteFileFromS3(photo.fileKey);
    }

    // Видалити зі зв'язувальної таблиці зайві записи
    await OrderPhotoLinks.destroy({
      where: { parentId: id, id: photosToDelete.map((p) => p.id) },
      transaction: photoTransaction,
    });

    for (const photo of newPhotos) {
      if (!photo.key) {
        console.warn("⚠️ Пропущено фото без key:", photo);
        continue;
      }
      const photoId = photo.id || uuidv4();
      await OrderPhotoLinks.upsert(
        {
          id: photoId,
          parentId: id,
          url: photo.url,
          fileKey: photo.key,
          description: photo.description || null,
          type: photo.type,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { transaction: photoTransaction }
      );
    }

    await photoTransaction.commit();
  } catch (error) {
    console.error("❌ Помилка при оновленні фото:", error);
    await photoTransaction.rollback();
    throw error;
  }
}

async function updateOrder(
  id,
  orderData,
  orderDeads,
  orderMaterials,
  orderWorks,
  orderServices,
  rowsPhotos
) {
  // 1. Збір попередніх даних поза транзакцією
  const order = await Orders.findByPk(id);
  if (!order) return { success: false, error: "Заказ не найден" };

  const oldPhotos = await OrderPhotoLinks.findAll({ where: { parentId: id } });
  const newUploadedFiles = await getNewUploadedFiles(rowsPhotos);

  // 2. Коротка транзакція для оновлення замовлення та підлеглих сутностей
  const mainTransaction = await Orders.sequelize.transaction();
  try {
    await order.update(orderData, { transaction: mainTransaction });
    await deleteRelatedData(id, mainTransaction);

    // Списання/повернення/оновлення
    await handleOrderDeads(orderDeads, id, mainTransaction);
    await handleOrderMaterials(orderMaterials, id, mainTransaction, true);
    await handleOrderWorks(orderWorks, id, mainTransaction);
    await handleOrderServices(orderServices, id, mainTransaction);

    await mainTransaction.commit();
  } catch (error) {
    console.error("❌ Помилка при оновленні замовлення:", error);

    // Якщо треба відкочувати S3
    for (const fileKey of newUploadedFiles) {
      try {
        await deleteFileFromS3(fileKey);
      } catch (s3Error) {
        console.error(`⚠️ Помилка видалення фото ${fileKey} з S3:`, s3Error);
      }
    }

    await mainTransaction.rollback();
    return { success: false, error: "Помилка при оновленні замовлення" };
  }

  // 3. Оновлення фото (опційно — в окремому блоці)
  try {
    if (rowsPhotos) {
      await processPhotos(id, rowsPhotos, oldPhotos);
    }
    // Надсилаємо повідомлення
    sendOrderUpdateMessage(`✏️ Заказ #${order.name} оновлено`, "orders");
    return { success: true, order };
  } catch (error) {
    console.error("⚠️ Помилка при обробці фотографій:", error);
    // За потреби — видаляємо завантажені фото із S3
    for (const fileKey of newUploadedFiles) {
      try {
        await deleteFileFromS3(fileKey);
      } catch (s3Error) {
        console.error(
          `⚠️ Повторна помилка видалення ${fileKey} з S3:`,
          s3Error
        );
      }
    }
    return { success: false, error: "Помилка при оновленні фотографій" };
  }
}

module.exports = {
  updateOrder,
};
