const {
  botStatus,
  botOrders,
  botWarehouse,
  statusChatIds,
  orderChatIds,
  warehouseChatIds,
} = require("../middleware/bots");

async function sendOrderUpdateMessage(message, type) {
  const targetChatIds = type === "status" ? statusChatIds : orderChatIds;
  const bot = type === "status" ? botStatus : botOrders;

  for (const chatId of targetChatIds) {
    try {
      await bot.sendMessage(chatId, message, { parse_mode: "HTML" });
    } catch (error) {
      console.error(`Ошибка отправки сообщения в чат ${chatId}:`, error);
    }
  }
}

async function sendLowStockNotification(materialName, requiredQuantity) {
  const message = `
    ⚠️ <b>На складе заканчивается:</b> ${materialName}\n 
    ⚠️ <b>Остаток меньше:</b> ${requiredQuantity}\n 
  `;

  for (const chatId of warehouseChatIds) {
    try {
      await botWarehouse.sendMessage(chatId, message, { parse_mode: "HTML" });
    } catch (error) {
      console.error(`Ошибка отправки уведомления в чат ${chatId}:`, error);
    }
  }
}

module.exports = {
  sendOrderUpdateMessage,
  sendLowStockNotification,
};
