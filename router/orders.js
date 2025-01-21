const { Router } = require("express");
const TelegramBot = require("node-telegram-bot-api");
const router = Router();
const { models } = require("../models/index");
const { v4: uuidv4 } = require("uuid");
const {
  Orders,
  OrderDeads,
  OrderMaterials,
  OrderWorks,
  OrderServices,
  Warehouse,
  Materials,
} = models;

const { Op } = require("sequelize");
const botStatusToken = "8162606893:AAEBI9zyxJ65SDAJAcYzPRDyXXbyuaWYkac";
const botOrdersTokken = "7983082460:AAGjnK4UrVeN8eNDKm0bQoFu0itVRxQ1-sE";
const botWarehouseToken = "7740212030:AAGOnzCMvqJrJkyrg3YpuQC7SrG7icJfuTE";
const bot = new TelegramBot(botStatusToken, { polling: true });
const botOrders = new TelegramBot(botOrdersTokken, { polling: true });
const botWarehouse = new TelegramBot(botWarehouseToken, { polling: true });

const statusChatIds = new Set();
const orderChatIds = new Set();
const warehouseChatIds = new Set();

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  statusChatIds.add(chatId);
  bot.sendMessage(
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

  warehouseChatIds.add(chatId);

  const welcomeMessage =
    "👋 Добро пожаловать! Вы будете получать уведомления об остатках на складе.";
  const replyMarkup = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Проверить остатки", callback_data: "check_stock" }],
      ],
    },
  };

  botWarehouse.sendMessage(chatId, welcomeMessage, replyMarkup);
});

botWarehouse.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const action = query.data;

  if (action === "check_stock") {
    try {
      const lowStockItems = await Warehouse.findAll({
        where: {
          quantity: {
            [Op.lt]: 5,
          },
        },
      });

      if (lowStockItems.length === 0) {
        return botWarehouse.sendMessage(chatId, "✅ Все запасы в порядке!");
      }

      const message = lowStockItems
        .map(
          (item) =>
            `🛠 <b>${item.name}(${item.length}X${item.width}X${item.thickness})</b>\n` +
            `Количество: ${item.quantity}\n\n`
        )
        .join("");

      botWarehouse.sendMessage(
        chatId,
        `⚠️ <b>Товары с низким запасом:</b>\n\n${message}`,
        { parse_mode: "HTML" }
      );
    } catch (error) {
      console.error("Ошибка при проверке складских остатков:", error);
      botWarehouse.sendMessage(
        chatId,
        "❌ Произошла ошибка при проверке остатков на складе."
      );
    }
  }

  botWarehouse.answerCallbackQuery(query.id);
});

async function sendLowStockNotification(
  materialName,
  requiredQuantity,
  availableQuantity,
  missingQuantity
) {
  const message = `
    ⚠️ <b>На складе заканчиваеться:</b> ${materialName}\n
    📦 <b>Требуется:</b> ${requiredQuantity}\n
    📦 <b>Доступно:</b> ${availableQuantity}\n
    ❗️ <b>Нужно дозаказать:</b> ${missingQuantity}
  `;

  for (const chatId of warehouseChatIds) {
    try {
      await botWarehouse.sendMessage(chatId, message, { parse_mode: "HTML" });
    } catch (error) {
      console.error(`Ошибка отправки уведомления в чат ${chatId}:`, error);
    }
  }
}

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

async function sendOrderUpdateMessage(message, type) {
  const targetChatIds = type === "status" ? statusChatIds : orderChatIds;

  for (const chatId of targetChatIds) {
    try {
      if (type === "status") {
        await bot.sendMessage(chatId, message, { parse_mode: "HTML" });
      } else {
        await botOrders.sendMessage(chatId, message, { parse_mode: "HTML" });
      }
    } catch (error) {
      console.error(`Ошибка отправки сообщения в чат ${chatId}:`, error);
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

async function handleOrderMaterials(
  orderMaterials,
  parentId,
  transaction,
  isUpdate = false
) {
  if (!orderMaterials || orderMaterials.length === 0) return;

  for (const material of orderMaterials) {
    const { quantity = 1, ...rest } = material;
    const isCreatedMenedger = material.isCreatedMenedger;

    const parsedQuantity = parseFloat(quantity) || 0;

    let previousQuantity = 0;

    if (isUpdate) {
      previousQuantity = await getPreviousOrderQuantity(
        parentId,
        material.name
      );
    }

    const quantityDifference = parsedQuantity - previousQuantity;

    if (isCreatedMenedger) {
      await processCustomMaterial(material, quantityDifference, transaction);
    } else if (material.warehouseId) {
      await processWarehouseMaterial(material, quantityDifference, transaction);
    }

    await OrderMaterials.upsert(
      { ...rest, quantity: parsedQuantity, parentId },
      { transaction }
    );
  }
}

async function getPreviousOrderQuantity(parentId, materialName) {
  const existingOrderMaterial = await OrderMaterials.findOne({
    where: { parentId, name: materialName },
  });

  if (!existingOrderMaterial) {
    return 0;
  }

  const previousQuantity = parseFloat(existingOrderMaterial.quantity) || 0;

  return previousQuantity;
}

async function processCustomMaterial(
  material,
  quantityDifference,
  transaction
) {
  const existingMaterial = await Materials.findOne({
    where: { name: material.name },
    transaction,
  });

  if (!existingMaterial) {
    await Materials.create(
      {
        name: material.name,
        length: material.length || null,
        width: material.width || null,
        thickness: material.thickness || null,
        price: material.price || 0,
        isCreateMenedger: true,
        quantity: parseFloat(quantityDifference),
      },
      { transaction }
    );
  } else {
    existingMaterial.quantity =
      (parseFloat(existingMaterial.quantity) || 0) +
      parseFloat(quantityDifference);
    await existingMaterial.save({ transaction });
  }
}

// async function processWarehouseMaterial(
//   material,
//   quantityDifference,
//   transaction
// ) {
//   const warehouseItem = await Warehouse.findByPk(material.warehouseId, {
//     transaction,
//   });

//   if (!warehouseItem) {
//     throw new Error(`Складской товар с ID ${material.warehouseId} не найден`);
//   }

//   const availableQuantity = parseFloat(warehouseItem.quantity) || 0;

//   if (quantityDifference > 0) {
//     if (availableQuantity >= quantityDifference) {
//       warehouseItem.quantity -= quantityDifference;
//     } else {
//       const missingQuantity = quantityDifference - availableQuantity;
//       warehouseItem.quantity = 0;

//       await updateOrCreateMaterial(
//         material,
//         missingQuantity,
//         false,
//         transaction
//       );

//       console.log("UPDATE OR CREATE");
//     }
//   } else if (quantityDifference < 0) {
//     warehouseItem.quantity += Math.abs(quantityDifference);
//   }

//   await warehouseItem.save({ transaction });
//   await sendLowStockNotification(
//     material.name, // Название материала
//     quantityDifference, // Требуемое количество
//     availableQuantity, // Доступное количество
//     missingQuantity // Недостающее количество
//   );
// }

async function processWarehouseMaterial(
  material,
  quantityDifference,
  transaction
) {
  const warehouseItem = await Warehouse.findByPk(material.warehouseId, {
    transaction,
  });

  if (!warehouseItem) {
    throw new Error(`Складской товар с ID ${material.warehouseId} не найден`);
  }

  const availableQuantity = parseFloat(warehouseItem.quantity) || 0;
  let missingQuantity = 0; // Объявляем переменную заранее

  if (quantityDifference > 0) {
    if (availableQuantity >= quantityDifference) {
      // Если на складе достаточно товара
      warehouseItem.quantity -= quantityDifference;
    } else {
      // Если товара на складе недостаточно
      missingQuantity = quantityDifference - availableQuantity;
      warehouseItem.quantity = 0;

      await updateOrCreateMaterial(
        material,
        missingQuantity,
        false,
        transaction
      );

      console.log("UPDATE OR CREATE");
    }
  } else if (quantityDifference < 0) {
    // Если происходит возврат материалов
    warehouseItem.quantity += Math.abs(quantityDifference);
  }

  await warehouseItem.save({ transaction });

  // Отправляем уведомление о нехватке, если недостающее количество больше 0
  if (missingQuantity > 0) {
    await sendLowStockNotification(
      material.name, // Название материала
      quantityDifference, // Требуемое количество
      availableQuantity, // Доступное количество
      missingQuantity // Недостающее количество
    );
  }
}

async function updateOrCreateMaterial(
  material,
  missingQuantity,
  isCreateMenedger,
  transaction
) {
  const materialData = material.warehouseId
    ? await getMaterialDataFromWarehouse(material.warehouseId, transaction)
    : {
        id: uuidv4(),
        name: material.name,
        length: material.length || null,
        width: material.width || null,
        thickness: material.thickness || null,
        weight: material.weight || 0,
        price: material.price || 0,
        priceM2: material.priceM2 || 0,
        quantity: material.quantity || 0,
        warehouseId: material.id,
      };

  const existingMaterial = await Materials.findOne({
    where: { id: materialData.id },
    transaction,
  });

  if (!existingMaterial) {
    await Materials.create(
      {
        ...materialData,
        isCreateMenedger: !!isCreateMenedger,
        quantity: parseFloat(missingQuantity),
      },
      { transaction }
    );
  } else {
    console.log(
      `[Обновление] Обновляем материал ${materialData.name}: добавляем ${missingQuantity}`
    );
    existingMaterial.quantity =
      (parseFloat(existingMaterial.quantity) || 0) +
      parseFloat(missingQuantity);

    await existingMaterial.save({ transaction });
  }
}

async function getMaterialDataFromWarehouse(warehouseId, transaction) {
  const warehouseItem = await Warehouse.findByPk(warehouseId, { transaction });

  if (!warehouseItem) {
    throw new Error(
      `Складской товар с ID ${warehouseId} не найден для добавления в Materials`
    );
  }

  return {
    id: uuidv4(),
    name: warehouseItem.name,
    length: warehouseItem.length || null,
    width: warehouseItem.width || null,
    thickness: warehouseItem.thickness || null,
    weight: warehouseItem.weight || 0,
    price: warehouseItem.price || 0,
    priceM2: warehouseItem.priceM2 || 0,
    warehouseId: warehouseItem.id,
  };
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

router.post("/create", async (req, res) => {
  const { orderData, orderDeads, orderMaterials, orderWorks, orderServices } =
    req.body;

  const transaction = await Orders.sequelize.transaction();

  try {
    const order = await Orders.create(orderData, { transaction });

    await handleOrderDeads(orderDeads, order.id, transaction);
    await handleOrderMaterials(orderMaterials, order.id, transaction, false);
    await handleOrderWorks(orderWorks, order.id, transaction);
    await handleOrderServices(orderServices, order.id, transaction);

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
    res.status(500).json({ message: "Помилка при створенні замовлення" });
  }
});

router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { orderData, orderDeads, orderMaterials, orderWorks, orderServices } =
    req.body;

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

    await transaction.commit();

    res.status(200).json({
      message: "Замовлення успішно оновлено",
      order,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Помилка при оновленні замовлення:", error);
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
    await Orders.update(
      { status: newStatus },
      { where: { id: orderId }, transaction }
    );

    const order = await Orders.findByPk(orderId);

    if (!order) {
      throw new Error("Замовлення не знайдено");
    }

    const message = `
📦 <b>Статус замовлення змінено</b>\n
📝 <b>Назва замовлення:</b> ${order.name}\n
👤 <b>Замовник:</b> ${order.first_name} ${order.second_name}\n
📞 <b>Телефон:</b> ${order.phone}\n
🕒 <b>Дата зміни:</b> ${new Date().toLocaleString()}\n
🔄 <b>Новий статус:</b> ${selectStatus(newStatus)}
    `;

    await sendOrderUpdateMessage(message, "status");

    await transaction.commit();

    res.status(200).json({ message: "Успішно статус змінено" });
  } catch (error) {
    await transaction.rollback();
    console.error("Помилка при зміні статусу замовлення:", error);
    res.status(500).json({ message: "Помилка при зміні статусу замовлення" });
  }
});

// router.delete("/remove-order/:orderId", async (req, res) => {
//   const { orderId } = req.params;

//   const transaction = await Orders.sequelize.transaction();

//   try {
//     const orderMaterials = await OrderMaterials.findAll({
//       where: { parentId: orderId },
//       transaction,
//     });

//     console.log("Матеріали замовлення:", orderMaterials);

//     for (const material of orderMaterials) {
//       console.log("Обробка матеріалу:", material);

//       if (material.warehouseId) {
//         const warehouseItem = await Warehouse.findByPk(material.warehouseId, {
//           transaction,
//         });

//         if (warehouseItem) {
//           console.log("Поточна кількість на складі:", warehouseItem.quantity);

//           const restoredQuantity = parseFloat(material.quantity) || 1;
//           warehouseItem.quantity =
//             (parseFloat(warehouseItem.quantity) || 0) + restoredQuantity;

//           console.log(
//             `Відновлено кількість: +${restoredQuantity}, Нова кількість: ${warehouseItem.quantity}`
//           );

//           await warehouseItem.save({ transaction });
//         } else {
//           console.warn(
//             `Складський ресурс із ID ${material.warehouseId} не знайдено`
//           );
//         }
//       }
//     }

//     await OrderMaterials.destroy({
//       where: { parentId: orderId },
//       transaction,
//     });

//     await Orders.destroy({ where: { id: orderId }, transaction });

//     await transaction.commit();

//     res.status(200).json({
//       message: "Замовлення успішно видалено, ресурси повернено на склад",
//     });
//   } catch (error) {
//     await transaction.rollback();
//     console.error("Помилка при видаленні замовлення:", error);
//     res.status(500).json({ message: "Помилка при видаленні замовлення" });
//   }
// });

//testing start

//testing end

// router.delete("/remove-order/:orderId", async (req, res) => {
//   const { orderId } = req.params;

//   const transaction = await Orders.sequelize.transaction();

//   try {
//     let totalCount = 0;
//     let returnedWarehouse = 0;
//     let materialQuantity = 0;

//     const newOrders = await Orders.findAll({
//       where: { status: "new" },
//       include: [{ model: OrderMaterials }],
//       transaction,
//     });

//     for (const order of newOrders) {
//       for (const material of order.OrderMaterials) {
//         totalCount += parseFloat(material.quantity) || 0;

//         const materialEntry = await Materials.findOne({
//           where: { warehouseId: material.warehouseId },
//           transaction,
//         });

//         if (materialEntry) {
//           materialQuantity = parseFloat(materialEntry.quantity) || 0;
//         }
//       }

//       returnedWarehouse = totalCount - materialQuantity;
//     }

//     console.log("KKKDKD", returnedWarehouse);

//     res.status(200).json({
//       message: "Замовлення успішно видалено, ресурси повернено на склад",
//     });
//   } catch (error) {
//     await transaction.rollback();
//     console.error("Ошибка при удалении заказа:", error);
//     res.status(500).json({ message: "Ошибка при удалении заказа" });
//   }
// });

module.exports = router;
