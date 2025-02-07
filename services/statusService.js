// services/statusService.js
const { models } = require("../models/index");
const { OrderStatuses, Orders } = models;
const { sendOrderUpdateMessage } = require("./notificationService");

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

function selectStatus(key) {
  return statusOptions[key] || "Неизвестный статус";
}

async function updateOrderStatus(orderId, statuses, name, transaction) {
  if (!orderId || !Array.isArray(statuses)) {
    throw new Error("orderId и массив statuses обязательны");
  }

  const allStatuses = Object.keys(statusOptions);
  const updateData = {};
  allStatuses.forEach((status) => (updateData[status] = false));
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

  sendOrderUpdateMessage(
    `🔄 Статус заказа ${name} изменен: ${selectStatus(mainStatus)}`,
    "status"
  );
  return selectStatus(mainStatus);
}

module.exports = { selectStatus, updateOrderStatus };
