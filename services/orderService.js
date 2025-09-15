const { models } = require("../models/index");
const {
  Orders,
  OrderDeads,
  OrderMaterials,
  OrderWorks,
  OrderServices,
  OrderStatuses,
  OrderPhotoLinks,
} = models;
const {
  handleOrderMaterials,
  reverseMaterialDeficit,
  deleteCustomMaterials,
  returnMaterialsToWarehouse,
  reverseCustomMaterial
} = require("./materialService");
const {
  handleOrderDeads,
  handleOrderServices,
  handleOrderWorks,
} = require("./otherInfoOrder");
const { sendOrderUpdateMessage } = require("./notificationService");
const { handleOrderPhotos, deleteFileFromS3 } = require("./photoService");
const { selectStatus } = require("./statusService");
const { Op } = require("sequelize");

async function createOrder(
  orderData,
  orderDeads,
  orderMaterials,
  orderWorks,
  orderServices,
  rowsPhotos
) {
  const transaction = await Orders.sequelize.transaction();
  try {
    const lastOrder = await Orders.findOne({
      where: { storeAddress: orderData.storeAddress },
      order: [["createdAt", "DESC"]],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    let lastNumber = 0;
    if (lastOrder && lastOrder.order_number) {
      const match = lastOrder.order_number.match(/\d+$/);
      lastNumber = match ? parseInt(match[0], 10) : 0;
    }

    const storePrefix = orderData.storeAddress
      ? orderData.storeAddress.slice(0, 2).toLowerCase()
      : "xx";
    orderData.order_number = `${storePrefix}-${lastNumber + 1}`;

    const order = await Orders.create(orderData, { transaction });
    await OrderStatuses.create(
      { parentId: order.id, new: true },
      { transaction }
    );

    await Promise.all([
      handleOrderDeads(orderDeads, order.id, transaction),
      handleOrderMaterials(orderMaterials, order.id, transaction, false),
      handleOrderWorks(orderWorks, order.id, transaction),
      handleOrderServices(orderServices, order.id, transaction),
      handleOrderPhotos(
        [...(rowsPhotos?.carvings || []), ...(rowsPhotos?.artistic || [])],
        order.id,
        transaction
      ),
    ]);

    await transaction.commit();

    const message = `
    📦 <b>Добавлен новый заказ</b>\n
    📝 <b>Название заказа:</b> ${order.name}\n
    👤 <b>Заказчик:</b> ${order.first_name} ${order.second_name}\n
    📞 <b>Телефон:</b> ${order.phone}\n
    🕒 <b>Дата изменения:</b> ${new Date().toLocaleString("ru-RU", {
  year: "numeric", month: "long", day: "numeric",
  hour: "2-digit", minute: "2-digit",
})}\n
    🔄 <b>Новый статус:</b> ${selectStatus(order.status)}\n
    💳 <b>Предоплата:</b> ${order.prepayment}₴\n
    💵 <b>К оплате:</b> ${order.totalPrice}₴\n
    💻 <b>Источник:</b> ${order.source}\n
    `;
    sendOrderUpdateMessage(message, "orders");
    return { success: true, order };
  } catch (error) {
    await transaction.rollback();
    console.error("Ошибка при создании заказа:", error);
    if (rowsPhotos) {
      const allPhotos = [
        ...(rowsPhotos.carvings || []),
        ...(rowsPhotos.artistic || []),
      ];
      await Promise.all(
        allPhotos.map(async (photo) => {
          if (photo.key) await deleteFileFromS3(photo.key);
        })
      );
    }
    throw error;
  }
}

async function getOrders(query) {
  try {
    const { status, startDate, endDate, search, storeAddress, page = 1, per_page = 10, source } = query;
    const where = {};
    const limit = parseInt(per_page) || 10;
    const currentPage = Math.max(1, parseInt(page) || 1);
    let offset = (currentPage - 1) * limit;

    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);
      where.createdAt = { [Op.between]: [start, end] };
    }
    if (status && status !== "all") where.status = status;
    if (source && source !== "all") where.source = source;
    if (search) {
      where[Op.or] = [
        { order_number: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { first_name: { [Op.like]: `%${search}%` } },
        { second_name: { [Op.like]: `%${search}%` } },
      ];
    }
    if (storeAddress && storeAddress !== "Все магазины") where.storeAddress = storeAddress;

    const totalOrders = await Orders.count({ where });
    const orders = await Orders.findAll({
      where,
      include: [ OrderMaterials, OrderWorks, OrderServices, OrderStatuses, OrderDeads, OrderPhotoLinks ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return {
      orders,
      totalOrders,
      currentPage,
      perPage: limit,
      totalPages: Math.ceil(totalOrders / limit),
    };
  } catch (error) {
    throw error;
  }
}

async function getOrderById(orderId) {
  try {
    return await Orders.findOne({
      where: { id: orderId },
      include: [ OrderMaterials, OrderWorks, OrderServices, OrderStatuses, OrderDeads, OrderPhotoLinks ],
    });
  } catch (error) {
    throw error;
  }
}

async function getOrdersWithTotal(query) {
  try {
    const { startDate, endDate, storeAddress, source } = query;
    const where = {};
    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);
      where.createdAt = { [Op.between]: [start, end] };
    }
    if (storeAddress && storeAddress !== "Все магазины") where.storeAddress = storeAddress;
    if (source && source !== "all") where.source = source;

    const totalSum = await Orders.sum("totalPrice", { where });
    const totalOrders = await Orders.count({ where });
    return { totalOrders, totalSum: totalSum || 0 };
  } catch (error) {
    console.error("Ошибка в getOrdersWithTotal:", error);
    throw error;
  }
}

async function deleteOrder(orderId) {
  const transaction = await Orders.sequelize.transaction();
  try {
    const order = await Orders.findByPk(orderId, { transaction });
    if (!order) throw new Error("Заказ не найден");

    const orderMaterials = await OrderMaterials.findAll({
      where: { parentId: orderId },
      transaction,
    });

    if (order.status !== 'completed') {
      await returnMaterialsToWarehouse(orderMaterials, transaction);
      await reverseMaterialDeficit(orderMaterials, transaction);
      await reverseCustomMaterial(orderMaterials, transaction);
    }
    await deleteCustomMaterials(orderMaterials, orderId, transaction);

    const orderPhotos = await OrderPhotoLinks.findAll({
      where: { parentId: orderId },
      transaction,
    });
    await Promise.all(
      orderPhotos.map(async (photo) => {
        if (photo.fileKey) await deleteFileFromS3(photo.fileKey);
      })
    );
    await OrderPhotoLinks.destroy({ where: { parentId: orderId }, transaction });
    await Orders.destroy({ where: { id: orderId }, transaction });

    await transaction.commit();
    sendOrderUpdateMessage(`🗑️ Заказ #${order.name} удален`, "orders");
    return { success: true, message: "Заказ успешно удален" };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  getOrdersWithTotal,
  deleteOrder,
};

