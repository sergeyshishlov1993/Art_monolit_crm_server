const { Router } = require("express");
const TelegramBot = require("node-telegram-bot-api");
const router = Router();
const { models } = require("../models/index");
const multer = require("multer");
const s3 = require("../s3Config");
const { v4: uuidv4 } = require("uuid");

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

const {
  botStatus,
  botOrders,
  botWarehouse,
  statusChatIds,
  orderChatIds,
  warehouseChatIds,
} = require("../middleware/bots");

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

function selectStatus(key) {
  const statusOptions = {
    new: "Новый",
    layout: "Макет",
    layout_accepted: "Принят Макет",
    engraving_front: "Гравировка(Фронт)",
    engraving_reverse: "Гравировка(Реверс)",
    engraving_plate: "Гравировка(Плита)",
    engraving_stand: "Гравировка(Тумба)",
    milling: "Фрезеровка",
    concreting: "Бетонирование",
    laying_tiles: "Укладка плитки",
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
      isCreateMenedger: true,
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
      }
    }

    if (!material.name || parsedQuantity <= 0) {
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
  const {
    status,
    startDate,
    endDate,
    search,
    storeAddress,
    page = 1,
    per_page = 10,
  } = req.query;

  try {
    const where = {};
    const limit = parseInt(per_page) || 10;
    const currentPage = Math.max(1, parseInt(page) || 1);
    let offset = (currentPage - 1) * limit;

    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);

      if (!isNaN(start) && !isNaN(end)) {
        where.createdAt = { [Op.between]: [start, end] };
      }
    } else if (startDate || endDate) {
      console.warn("⚠️ Указана только одна дата! Пропускаем фильтр.");
      return res.status(400).json({ message: "Необходимо указать обе даты" });
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { phone: { [Op.like]: `%${search}%` } },
        { first_name: { [Op.like]: `%${search}%` } },
        { second_name: { [Op.like]: `%${search}%` } },
      ];
    }

    if (storeAddress) {
      where.storeAddress = { [Op.like]: `%${storeAddress}%` };
    }

    const totalOrders = await Orders.count({ where });

    if (totalOrders === 0) {
      return res.status(200).json({
        message: "Успешно (Заказы)",
        orders: [],
        totalOrders: 0,
        currentPage,
        perPage: limit,
        totalPages: 1,
      });
    }

    const totalPages = Math.ceil(totalOrders / limit);

    offset = Math.min(offset, Math.max(0, totalOrders - limit));

    const orders = await Orders.findAll({
      where,
      include: [
        { model: models.OrderMaterials },
        { model: models.OrderWorks },
        { model: models.OrderServices },
        { model: models.OrderStatuses },
        { model: models.OrderDeads },
        { model: models.OrderPhotoLinks },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    res.status(200).json({
      message: "Успешно (Заказы)",
      orders,
      totalOrders,
      currentPage,
      perPage: limit,
      totalPages,
    });
  } catch (error) {
    console.error("❌ Ошибка при получении заказов:", error);
    res.status(500).json({ message: "Ошибка при получении заказов" });
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
      return res.status(404).json({ message: "Заказ не найден" });
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

    const newPhotos = [
      ...(rowsPhotos.carvings || []),
      ...(rowsPhotos.artistic || []),
    ];

    const newPhotoIds = new Set(
      newPhotos.map((photo) => photo.id).filter(Boolean)
    );

    const photosToDelete = oldPhotos.filter(
      (photo) => !newPhotoIds.has(photo.id)
    );

    for (const photo of photosToDelete) {
      if (photo.fileKey) {
        await deleteFileFromS3(photo.fileKey);
      }
    }

    await OrderPhotoLinks.destroy({
      where: {
        parentId: id,
        id: photosToDelete.map((photo) => photo.id),
      },
      transaction,
    });

    for (const photo of newPhotos) {
      if (!photo.key) {
        console.warn("⚠️ Пропущено фото без key:", photo);
        continue;
      }

      await OrderPhotoLinks.upsert(
        {
          id: photo.id || uuidv4(),
          parentId: id,
          url: photo.url,
          fileKey: photo.key,
          description: photo.description || null,
          type: photo.type,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { transaction }
      );
    }

    await transaction.commit();

    res.status(200).json({
      message: "Заказ успешно обновлен",
      order,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Ошибка при обновлении заказа:", error);
    res.status(500).json({ message: "Ошибка при обновлении заказа" });
  }
});

router.put("/change-status-order", async (req, res) => {
  const { orderId, statuses } = req.body;

  if (!orderId || !Array.isArray(statuses)) {
    return res
      .status(400)
      .json({ message: "orderId и statuses (массив) обязательны" });
  }

  const transaction = await Orders.sequelize.transaction();

  try {
    const order = await Orders.findByPk(orderId, { transaction });

    if (!order) {
      throw new Error("Заказ не найден");
    }

    const allStatuses = [
      "new",
      "layout",
      "layout_accepted",
      "engraving_front",
      "engraving_reverse",
      "engraving_plate",
      "engraving_stand",
      "milling",
      "concreting",
      "laying_tiles",
      "installation",
      "completed",
    ];

    const updateData = {};
    allStatuses.forEach((status) => {
      updateData[status] = false;
    });

    statuses.forEach((status) => {
      if (allStatuses.includes(status)) {
        updateData[status] = true;
      }
    });

    await OrderStatuses.update(updateData, {
      where: { parentId: orderId },
      transaction,
    });

    const mainStatus = statuses.length ? statuses[statuses.length - 1] : null;

    await Orders.update(
      { status: mainStatus },
      { where: { id: orderId }, transaction }
    );

    const message = `
📦 <b>Статус замовлення змінено</b>\n
📝 <b>Назва замовлення:</b> ${order.name}\n
👤 <b>Замовник:</b> ${order.first_name} ${order.second_name}\n
📞 <b>Телефон:</b> ${order.phone}\n
🕒 <b>Дата зміни:</b> ${new Date().toLocaleString()}\n
🔄 <b>Новий статус:</b> ${selectStatus(mainStatus)}
    `;

    await sendOrderUpdateMessage(message, "status");

    await transaction.commit();

    res.status(200).json({ message: "Успішно статуси оновлено" });
  } catch (error) {
    await transaction.rollback();
    console.error("Помилка при зміні статусів замовлення:", error);
    res.status(500).json({ message: "Помилка при зміні статусів замовлення" });
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
