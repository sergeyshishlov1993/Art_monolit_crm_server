const { Router } = require("express");
const TelegramBot = require("node-telegram-bot-api");
const router = Router();
const { models } = require("../models/index");
const multer = require("multer");
const s3 = require("../s3Config");

const {
  Orders,
  OrderDeads,
  OrderMaterials,
  OrderWorks,
  OrderServices,
  OrderStatuses,
  Warehouse,
  Materials,
  OrderPhotoLinks,
} = models;

const { Op } = require("sequelize");
const upload = multer({ storage: multer.memoryStorage() });

//TELEGRAM BOTS
const botStatusToken = "8162606893:AAEBI9zyxJ65SDAJAcYzPRDyXXbyuaWYkac";
const botStatus = new TelegramBot(botStatusToken, { polling: true });
const statusChatIds = new Set();

const botOrdersTokken = "7983082460:AAGjnK4UrVeN8eNDKm0bQoFu0itVRxQ1-sE";
const botOrders = new TelegramBot(botOrdersTokken, { polling: true });
const orderChatIds = new Set();

const botWarehouseToken = "7819287579:AAFX0VMVwXNI-nequ_R69KGGIUofv6j-Dro";
const botWarehouse = new TelegramBot(botWarehouseToken, { polling: true });
const warehouseChatIds = new Set();

botStatus.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  statusChatIds.add(chatId);
  botStatus.sendMessage(
    chatId,
    "👋 Добро пожаловать! Вы будете получать уведомления о статусах заказов."
  );
});

botOrders.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  orderChatIds.add(chatId);
  botOrders.sendMessage(
    chatId,
    "👋 Добро пожаловать! Вы будете получать уведомления о новых заказах."
  );
});

botWarehouse.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  if (!warehouseChatIds.has(chatId)) {
    warehouseChatIds.add(chatId);

    const welcomeMessage =
      "👋 Добро пожаловать! Вы будете получать уведомления об остатках на складе.";

    botWarehouse.sendMessage(chatId, welcomeMessage, {
      reply_markup: {
        remove_keyboard: true,
        inline_keyboard: [],
      },
    });
  } else {
    botWarehouse.sendMessage(
      chatId,
      "Вы уже зарегистрированы для уведомлений.",
      {
        reply_markup: {
          remove_keyboard: true,
        },
      }
    );
  }
});

//

function selectStatus(key) {
  const statusOptions = {
    new: "Новый",
    layout: "Макет",
    "layout-accepted": "Принят Макет",
    "engraving(front)": "Гравировка(Фронт)",
    "engraving(reverse)": "Гравировка(Реверс)",
    "engraving(plate)": "Гравировка(Плита)",
    "engraving(stand)": "Гравировка(Тумба)",
    milling: "Фрезеровка",
    concreting: "Бетонирование",
    "laying-tiles": "Укладка плитки",
    installation: "Установка",
    completed: "Завершен",
  };

  return statusOptions[key];
}
async function createMissingMaterial(material, deficit, transaction) {
  const existingMaterial = await Materials.findOne({
    where: { name: material.name },
    transaction,
  });

  if (!existingMaterial) {
    await Materials.create(
      {
        id: material.id,
        name: material.name,
        length: material.length || null,
        width: material.width || null,
        thickness: material.thickness || null,
        price: material.price || 0,
        priceM2: material.priceM2,
        weight: material.weight,
        quantity: deficit,
        isCreateMenedger: false,
      },
      { transaction }
    );
  } else {
    existingMaterial.quantity += deficit;

    await existingMaterial.save({ transaction });
  }
}
async function createCustomMaterials(material, transaction) {
  await Materials.create(
    {
      id: material.id,
      name: material.name,
      length: material.length || null,
      width: material.width || null,
      thickness: material.thickness || null,
      price: material.price || 0,
      priceM2: material.priceM2,
      weight: material.weight,
      quantity: material.quantity,
      isCreateMenedger: false,
    },
    { transaction }
  );
}
async function deleteCustomMaterials(orderMaterials, transaction) {
  for (const material of orderMaterials) {
    if (material.isCreatedMenedger) {
      await Materials.destroy({
        where: { name: material.name },
        transaction,
      });
    }
  }
}
async function deleteRelatedData(parentId, transaction) {
  await OrderDeads.destroy({ where: { parentId }, transaction });
  await OrderMaterials.destroy({ where: { parentId }, transaction });
  await OrderWorks.destroy({ where: { parentId }, transaction });
  await OrderServices.destroy({ where: { parentId }, transaction });
}
async function handleOrderDeads(orderDeads, parentId, transaction) {
  if (orderDeads && orderDeads.length > 0) {
    for (const dead of orderDeads) {
      await OrderDeads.create({ ...dead, parentId }, { transaction });
    }
  }
}
async function sendLowStockNotification(materialName, requiredQuantity) {
  const message = `
    ⚠️ <b>На складе заканчиваеться:</b> ${materialName}\n 
    ⚠️ <b>Остаток меньше :</b> ${requiredQuantity}\n 
   
  `;

  for (const chatId of warehouseChatIds) {
    try {
      await botWarehouse.sendMessage(chatId, message, { parse_mode: "HTML" });
    } catch (error) {
      console.error(`Ошибка отправки уведомления в чат ${chatId}:`, error);
    }
  }
}

async function handleOrderMaterials(
  orderMaterials,
  parentId,
  transaction,
  isUpdate = false
) {
  if (!orderMaterials || orderMaterials.length === 0) return;

  for (const material of orderMaterials) {
    const { quantity = 1, warehouseId, ...rest } = material;

    const parsedQuantity = parseFloat(quantity) || 0;
    let previousQuantity = 0;

    if (isUpdate) {
      const oldOrderMaterials = await OrderMaterials.findAll({
        where: { parentId },
      });

      if (oldOrderMaterials.length !== orderMaterials.length) {
        const newMaterialIds = orderMaterials.map((item) => String(item.id));

        const deletedMaterials = oldOrderMaterials.filter(
          (oldMaterial) => !newMaterialIds.includes(String(oldMaterial.id))
        );

        await returnMaterialsToWarehouse(deletedMaterials);
        await updateMaterialsDeficit(deletedMaterials);
      }

      if (oldOrderMaterials.length > 0) {
        await returnMaterialsToWarehouse(oldOrderMaterials);
        await updateMaterialsDeficit(orderMaterials);
      } else {
        console.log(
          "NO OLD MATERIALS FOUND. SKIPPING RETURN AND DEFICIT UPDATE"
        );
      }
    }

    // Перевірка значення material перед виконанням операцій
    if (!material.name || parsedQuantity <= 0) {
      console.log(
        `SKIPPING: Invalid material data - ${JSON.stringify(material)}`
      );
      continue;
    }

    if (material.isCreatedMenedger) {
      await createCustomMaterials(material, transaction);

      await OrderMaterials.upsert(
        {
          ...material,
          quantity: parsedQuantity,
          deficit: 0,
          parentId,
          warehouseId: null,
        },
        { transaction }
      );
    } else {
      const quantityDifference = parsedQuantity - previousQuantity;

      let deficit = 0;

      if (warehouseId) {
        const warehouseItem = await Warehouse.findByPk(warehouseId, {
          transaction,
        });

        if (!warehouseItem) {
          throw new Error(`Складской товар с ID ${warehouseId} не найден`);
        }

        const availableQuantity = parseFloat(warehouseItem.quantity) || 0;

        if (availableQuantity < 5) {
          await sendLowStockNotification(
            `${warehouseItem.name}${warehouseItem.length}X${warehouseItem.width}X${warehouseItem.thickness}`,
            availableQuantity
          );
        }

        if (quantityDifference > 0) {
          if (availableQuantity >= quantityDifference) {
            warehouseItem.quantity -= quantityDifference;
          } else {
            deficit = quantityDifference - availableQuantity;
            warehouseItem.quantity = 0;

            await createMissingMaterial(warehouseItem, deficit, transaction);
          }

          await warehouseItem.save({ transaction });
        } else if (quantityDifference < 0) {
          warehouseItem.quantity += Math.abs(quantityDifference);
          deficit = 0;
          await warehouseItem.save({ transaction });
        }
      }

      await OrderMaterials.upsert(
        {
          ...rest,
          quantity: parsedQuantity,
          deficit,
          parentId,
          warehouseId,
        },
        { transaction }
      );
    }
  }
}

async function handleOrderServices(orderServices, parentId, transaction) {
  if (orderServices && orderServices.length > 0) {
    for (const service of orderServices) {
      await OrderServices.create({ ...service, parentId }, { transaction });
    }
  }
}
async function handleOrderWorks(orderWorks, parentId, transaction) {
  if (orderWorks && orderWorks.length > 0) {
    for (const work of orderWorks) {
      await OrderWorks.create({ ...work, parentId }, { transaction });
    }
  }
}
async function sendOrderUpdateMessage(message, type) {
  const targetChatIds = type === "status" ? statusChatIds : orderChatIds;

  for (const chatId of targetChatIds) {
    console.log("targetChatIds", targetChatIds);
    console.log("type", type);
    try {
      if (type === "status") {
        await botStatus.sendMessage(chatId, message, { parse_mode: "HTML" });
      } else {
        await botOrders.sendMessage(chatId, message, { parse_mode: "HTML" });
      }
    } catch (error) {
      console.error(`Ошибка отправки сообщения в чат ${chatId}:`, error);
    }
  }
}
async function returnMaterialsToWarehouse(orderMaterials, transaction) {
  for (const material of orderMaterials) {
    if (material.isCreatedMenedger) {
      continue;
    }

    const warehouseItem = await Warehouse.findByPk(material.warehouseId, {
      transaction,
    });

    if (warehouseItem) {
      const returnableQuantity =
        parseFloat(material.quantity) - parseFloat(material.deficit || 0);

      warehouseItem.quantity += returnableQuantity;
      await warehouseItem.save({ transaction });
    } else {
      console.warn(
        `Складской товар с ID ${material.warehouseId} не найден для материала ${material.name}`
      );
    }
  }
}
async function updateMaterialsDeficit(orderMaterials, transaction) {
  for (const material of orderMaterials) {
    if (material.isCreatedMenedger) {
      continue;
    }
    if (material.deficit && material.deficit > 0) {
      const existingMaterial = await Materials.findByPk(material.warehouseId, {
        transaction,
      });

      if (existingMaterial) {
        existingMaterial.quantity -= material.deficit; // Уменьшаем количество
        if (existingMaterial.quantity < 0) existingMaterial.quantity = 0; // Не допускаем отрицательных значений

        await existingMaterial.save({ transaction });

        if (existingMaterial.quantity === 0) {
          await Materials.destroy({
            where: {
              id: material.warehouseId,
            },
            transaction,
          });
        }
      } else {
        console.warn(
          `Материал с ID ${material.warehouseId} не найден в таблице Materials`
        );
      }
    }
  }
}

router.get("/", async (req, res) => {
  const { status, startDate, endDate, search } = req.query;

  try {
    const where = {};

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(endDate);
      }
    }

    // Пошук
    if (search) {
      where[Op.or] = [{ phone: { [Op.like]: `%${search}%` } }];
    }

    const orders = await Orders.findAll({
      where,
      include: [
        {
          model: models.OrderMaterials,
        },
        {
          model: models.OrderWorks,
        },
        {
          model: models.OrderServices,
        },
        {
          model: models.OrderDeads,
        },
        {
          model: models.OrderStatuses,
        },
        {
          model: models.OrderPhotoLinks,
        },
      ],
    });

    res.status(200).json({
      message: "Успешно (Заказы)",
      orders,
    });
  } catch (error) {
    console.error("Ошибка при обновлении данных:", error);
    res.status(500).json({ message: "Ошибка при обновлении данных" });
  }
});
router.get("/:id", async (req, res) => {
  const { id: orderId } = req.params;

  try {
    const order = await Orders.findOne({
      where: { id: orderId },
      include: [
        {
          model: models.OrderMaterials,
        },
        {
          model: models.OrderWorks,
        },
        {
          model: models.OrderServices,
        },
        {
          model: models.OrderDeads,
        },
        {
          model: models.OrderStatuses,
        },
        {
          model: models.OrderPhotoLinks,
        },
      ],
    });

    if (!order) {
      return res
        .status(404)
        .json({ message: `Заказ с ID ${orderId} не найден` });
    }

    res.status(200).json({
      message: `Успешно (Заказ, ${orderId})`,
      order,
    });
  } catch (error) {
    console.error("Ошибка при получении данных заказа:", error);
    res.status(500).json({ message: "Ошибка при получении данных заказа" });
  }
});
router.post("/create", upload.array("photos"), async (req, res) => {
  const {
    orderData,
    orderDeads,
    orderMaterials,
    orderWorks,
    orderServices,
    rowsPhotos,
  } = req.body;

  const transaction = await Orders.sequelize.transaction();

  try {
    const order = await Orders.create(orderData, { transaction });

    await OrderStatuses.create(
      {
        parentId: order.id,
        new: true,
      },
      { transaction }
    );

    await handleOrderDeads(orderDeads, order.id, transaction);
    await handleOrderMaterials(orderMaterials, order.id, transaction, false);
    await handleOrderWorks(orderWorks, order.id, transaction);
    await handleOrderServices(orderServices, order.id, transaction);

    if (
      rowsPhotos &&
      (rowsPhotos.carvings?.length > 0 || rowsPhotos.artistic?.length > 0)
    ) {
      await handleOrderPhotos(
        [...(rowsPhotos.carvings || []), ...(rowsPhotos.artistic || [])],
        order.id,
        transaction
      );
    }

    const message = `
    📦 <b>Добавлен новый заказ</b>\n
    📝 <b>Назва замовлення:</b> ${order.name}\n
    👤 <b>Замовник:</b> ${order.first_name} ${order.second_name}\n
    📞 <b>Телефон:</b> ${order.phone}\n
    🕒 <b>Дата зміни:</b> ${new Date().toLocaleString()}\n
    🔄 <b>Новий статус:</b> ${selectStatus(order.status)}\n
    💳 <b>Предоплата:</b> ${order.prepayment}₴\n
    💵 <b>К оплате:</b> ${order.totalPrice}₴\n
    💻 <b>Источник:</b> ${order.source}\n

        `;

    await sendOrderUpdateMessage(message, "orders");

    await transaction.commit();

    res.status(200).json({
      message: "Успішно створено замовлення",
      order,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Помилка при створенні замовлення:", error);

    if (rowsPhotos) {
      const allPhotos = [
        ...(rowsPhotos.carvings || []),
        ...(rowsPhotos.artistic || []),
      ];

      await Promise.all(
        allPhotos.map(async (photo) => {
          await deleteFileFromS3(photo.key);
        })
      );
    }

    res.status(500).json({ message: "Помилка при створенні замовлення" });
  }
});
// router.put("/update/:id", upload.array("photos"), async (req, res) => {
//   const { id } = req.params;
//   const { orderData, orderDeads, orderMaterials, orderWorks, orderServices } =
//     req.body;

//   const transaction = await Orders.sequelize.transaction();

//   try {
//     const order = await Orders.findByPk(id);
//     if (!order) {
//       return res.status(404).json({ message: "Замовлення не знайдено" });
//     }

//     await order.update(orderData, { transaction });
//     await deleteRelatedData(id, transaction);
//     await handleOrderDeads(orderDeads, id, transaction);
//     await handleOrderMaterials(orderMaterials, id, transaction, true);
//     await handleOrderWorks(orderWorks, id, transaction);
//     await handleOrderServices(orderServices, id, transaction);

//     if (
//       rowsPhotos &&
//       (rowsPhotos.carvings?.length > 0 || rowsPhotos.artistic?.length > 0)
//     ) {
//       await handleOrderPhotos(
//         [...(rowsPhotos.carvings || []), ...(rowsPhotos.artistic || [])],
//         order.id,
//         transaction
//       );
//     }

//     await transaction.commit();

//     res.status(200).json({
//       message: "Замовлення успішно оновлено",
//       order,
//     });
//   } catch (error) {
//     await transaction.rollback();
//     console.error("Помилка при оновленні замовлення:", error);
//     res.status(500).json({ message: "Помилка при оновленні замовлення" });
//   }
// });

router.put("/update/:id", upload.array("photos"), async (req, res) => {
  const { id } = req.params;
  const {
    orderData,
    orderDeads,
    orderMaterials,
    orderWorks,
    orderServices,
    rowsPhotos = {},
  } = req.body;

  const transaction = await Orders.sequelize.transaction();

  try {
    const order = await Orders.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: "Замовлення не знайдено" });
    }

    await order.update(orderData, { transaction });
    await deleteRelatedData(id, transaction);
    await handleOrderDeads(orderDeads, id, transaction);
    await handleOrderMaterials(orderMaterials, id, transaction, true);
    await handleOrderWorks(orderWorks, id, transaction);
    await handleOrderServices(orderServices, id, transaction);

    const oldPhotos = await OrderPhotoLinks.findAll({
      where: { parentId: id },
      transaction,
    });

    const newPhotoKeys = new Set(
      [...(rowsPhotos.carvings || []), ...(rowsPhotos.artistic || [])]
        .map((photo) => photo.fileKey || photo.key)
        .filter(Boolean)
    );

    const photosToDelete = oldPhotos.filter(
      (photo) => photo.fileKey && !newPhotoKeys.has(photo.fileKey)
    );

    await Promise.all(
      photosToDelete.map(async (photo) => {
        if (photo.fileKey) {
          await deleteFileFromS3(photo.fileKey);
        }
      })
    );

    await OrderPhotoLinks.destroy({
      where: {
        parentId: id,
        fileKey: photosToDelete.map((photo) => photo.fileKey),
      },
      transaction,
    });

    if (
      Array.isArray(rowsPhotos.carvings) ||
      Array.isArray(rowsPhotos.artistic)
    ) {
      await handleOrderPhotos(
        [...(rowsPhotos.carvings || []), ...(rowsPhotos.artistic || [])],
        id,
        transaction
      );
    }

    await transaction.commit();

    res.status(200).json({
      message: "Замовлення успішно оновлено",
      order,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Помилка при оновленні замовлення:", error);
    res.status(500).json({ message: "Помилка при оновленні замовлення" });
  }
});

router.put("/change-status-order", async (req, res) => {
  const { orderId, newStatus } = req.body;

  if (!orderId || !newStatus) {
    return res
      .status(400)
      .json({ message: "orderId та newStatus є обов'язковими" });
  }

  const transaction = await Orders.sequelize.transaction();

  try {
    const orderStatus = await OrderStatuses.findOne({
      where: { parentId: orderId },
      transaction,
    });

    if (!orderStatus) {
      throw new Error("Статуси для замовлення не знайдені");
    }

    if (
      !Object.prototype.hasOwnProperty.call(orderStatus.dataValues, newStatus)
    ) {
      throw new Error("Новий статус є недійсним");
    }

    // Установить новый статус в true
    const updatedStatuses = { [newStatus]: true };

    // Обновить только переданный статус, остальные оставить без изменений
    await OrderStatuses.update(updatedStatuses, {
      where: { parentId: orderId },
      transaction,
    });

    // Найти заказ для уведомления
    const order = await Orders.findByPk(orderId);

    if (!order) {
      throw new Error("Замовлення не знайдено");
    }

    // Создать сообщение
    const message = `
📦 <b>Статус замовлення змінено</b>\n
📝 <b>Назва замовлення:</b> ${order.name}\n
👤 <b>Замовник:</b> ${order.first_name} ${order.second_name}\n
📞 <b>Телефон:</b> ${order.phone}\n
🕒 <b>Дата зміни:</b> ${new Date().toLocaleString()}\n
🔄 <b>Новий статус:</b> ${selectStatus(newStatus)}
    `;

    // Отправить уведомление
    await sendOrderUpdateMessage(message, "status");

    await transaction.commit();

    res.status(200).json({ message: "Успішно статус змінено" });
  } catch (error) {
    await transaction.rollback();
    console.error("Помилка при зміні статусу замовлення:", error);
    res.status(500).json({ message: "Помилка при зміні статусу замовлення" });
  }
});

router.delete("/remove-order/:orderId", async (req, res) => {
  const { orderId } = req.params;

  const transaction = await Orders.sequelize.transaction();

  try {
    const order = await Orders.findByPk(orderId, { transaction });

    const isCompleted = order.status === "completed";

    const orderMaterials = await OrderMaterials.findAll({
      where: { parentId: orderId },
      transaction,
    });

    if (orderMaterials.length === 0) {
      console.log("Материалы для заказа не найдены.");
      return res
        .status(404)
        .json({ message: "Материалы для заказа не найдены" });
    }

    if (!isCompleted) {
      await returnMaterialsToWarehouse(orderMaterials, transaction);
      await updateMaterialsDeficit(orderMaterials, transaction);
    }

    await deleteCustomMaterials(orderMaterials, transaction);

    const orderPhotos = await OrderPhotoLinks.findAll({
      where: { parentId: orderId },
      transaction,
    });

    await Promise.all(
      orderPhotos.map(async (photo) => {
        await deleteFileFromS3(photo.fileKey);
      })
    );

    await OrderPhotoLinks.destroy({
      where: { parentId: orderId },
      transaction,
    });

    await Orders.destroy({
      where: { id: orderId },
      transaction,
    });

    await transaction.commit();

    res.status(200).json({
      message: "Заказ успешно удален, ресурсы возвращены на склад",
    });
  } catch (error) {
    await transaction.rollback();
    console.error(
      `Ошибка при удалении заказа с ID: ${orderId}. Откат транзакции.`
    );
    console.error("Детали ошибки:", error);

    res.status(500).json({ message: "Ошибка при удалении заказа" });
  }
});

router.delete("/delete-from-s3", async (req, res) => {
  const { fileKey } = req.query;
  console.log("🗑️ Запрос на удаление:", fileKey);

  await deleteFileFromS3(fileKey);

  try {
    res.status(200).json({
      message: "Фото с s3 успешно удалено",
    });
  } catch (error) {
    console.error(`Ошибка при удалении фото с key: ${fileKey}.`);
    console.error("Детали ошибки:", error);

    res.status(500).json({ message: "Ошибка при удалении заказа" });
  }
});

const handleOrderPhotos = async (allPhotos, parentId, transaction) => {
  console.log("parentId", parentId);
  if (!parentId) {
    throw new Error("parentId обязателен!");
  }

  if (!Array.isArray(allPhotos) || allPhotos.length === 0) {
    console.log("⚠️ Нет данных для сохранения.");
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

const deleteFileFromS3 = async (fileKey) => {
  try {
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
    };

    await s3.deleteObject(params).promise();
  } catch (error) {
    console.error(`❌ Ошибка при удалении файла ${fileKey}:`, error.message);
  }
};
module.exports = router;
