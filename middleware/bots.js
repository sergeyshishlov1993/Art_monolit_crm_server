const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();
const botStatus = new TelegramBot(process.env.BOT_STATUS_TOKEN, {
  polling: true,
});
const statusChatIds = new Set();

botStatus.on('polling_error', (error) => {

});


const botOrders = new TelegramBot(process.env.BOT_ORDERS_TOKEN, {
  polling: true,
});
const orderChatIds = new Set();botOrders.on('polling_error', (error) => {
});

const botWarehouse = new TelegramBot(process.env.BOT_WAREHOUSE_TOKEN, {
  polling: true,
});
const warehouseChatIds = new Set();

botWarehouse.on('polling_error', (error) => {
});

module.exports = {
  botStatus,
  botOrders,
  botWarehouse,
  statusChatIds,
  orderChatIds,
  warehouseChatIds,
};
