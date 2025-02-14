// routes/orderRoutes.js
const { Router } = require("express");
const upload = require("multer")({
  storage: require("multer").memoryStorage(),
});
const {
  createOrder,
  getOrders,
  getOrderById,
  // updateOrder,
  deleteOrder,
  getOrdersWithTotal,
} = require("../services/orderService");
const { updateOrder } = require("../services/updateOrder");
const { updateOrderStatus } = require("../services/statusService");

const router = Router();

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

router.get("/", async (req, res) => {
  try {
    const orders = await getOrders(req.query);
    res.status(200).json(orders);
  } catch (error) {
    console.error("Ошибка при получении заказов:", error);
    res.status(500).json({ message: "Ошибка при получении заказов" });
  }
});

router.get("/calc-orders", async (req, res) => {
  try {
    const result = await getOrdersWithTotal(req.query);
    res.json(result);
  } catch (error) {
    console.error("Ошибка при получении заказов:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const order = await getOrderById(id);
    if (!order) {
      return res.status(404).json({ message: `Заказ с ID ${id} не найден` });
    }
    res.status(200).json({ message: "Успешно (Заказ)", order });
  } catch (error) {
    console.error("Ошибка при получении данных заказа:", error);
    res.status(500).json({ message: "Ошибка при получении данных заказа" });
  }
});

router.post("/create", upload.array("photos"), async (req, res) => {
  try {
    const {
      orderData,
      orderDeads,
      orderMaterials,
      orderWorks,
      orderServices,
      rowsPhotos,
    } = req.body;
    const result = await createOrder(
      orderData,
      orderDeads,
      orderMaterials,
      orderWorks,
      orderServices,
      rowsPhotos
    );
    res
      .status(200)
      .json({ message: "Успешно создан заказ", order: result.order });
  } catch (error) {
    console.error("Ошибка при создании заказа:", error);
    res.status(500).json({ message: "Ошибка при создании заказа" });
  }
});

router.put("/update/:id", upload.array("photos"), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      orderData,
      orderDeads,
      orderMaterials,
      orderWorks,
      orderServices,
      rowsPhotos,
    } = req.body;
    const result = await updateOrder(
      id,
      orderData,
      orderDeads,
      orderMaterials,
      orderWorks,
      orderServices,
      rowsPhotos
    );
    if (result.success) {
      return res
        .status(200)
        .json({ message: "Заказ успішно оновлено", order: result.order });
    }
    return res.status(400).json({ message: result.error });
  } catch (error) {
    console.error("Помилка при оновленні замовлення:", error);
    res.status(500).json({ message: "Помилка при оновленні замовлення" });
  }
});

// router.put("/update/:id", upload.array("photos"), async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       orderData,
//       orderDeads,
//       orderMaterials,
//       orderWorks,
//       orderServices,
//       rowsPhotos,
//     } = req.body;
//     const result = await updateOrder(
//       id,
//       orderData,
//       orderDeads,
//       orderMaterials,
//       orderWorks,
//       orderServices,
//       rowsPhotos
//     );
//     res
//       .status(200)
//       .json({ message: "Заказ успешно обновлен", order: result.order });
//   } catch (error) {
//     console.error("Ошибка при обновлении заказа:", error);
//     res.status(500).json({ message: "Ошибка при обновлении заказа" });
//   }
// });

router.put("/change-status-order", async (req, res) => {
  try {
    const { orderId, statuses, name } = req.body;
    if (!orderId || !Array.isArray(statuses)) {
      return res
        .status(400)
        .json({ message: "orderId и statuses (массив) обязательны" });
    }
    const newStatus = await updateOrderStatus(orderId, statuses, name);

    res.status(200).json({ message: "Статус заказа обновлен", newStatus });
  } catch (error) {
    console.error("Ошибка при смене статуса заказа:", error);
    res.status(500).json({ message: "Ошибка при смене статуса заказа" });
  }
});

router.delete("/remove-order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await deleteOrder(orderId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Ошибка при удалении заказа:", error);
    res.status(500).json({ message: "Ошибка при удалении заказа" });
  }
});

module.exports = router;
