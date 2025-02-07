// services/orderService.js
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
  createMissingMaterial,
  handleOrderMaterials,
  returnMaterialsToWarehouse,
  updateMaterialsDeficit,
  deleteCustomMaterials,
} = require("./materialService");

const {
  handleOrderDeads,
  handleOrderServices,
  handleOrderWorks,
  deleteRelatedData,
} = require("./otherInfoOrder");
const { sendOrderUpdateMessage } = require("./notificationService");
const {
  handleOrderPhotos,
  deleteFileFromS3,
  deleteOrderPhotos,
} = require("./photoService");
const { selectStatus, updateOrderStatus } = require("./statusService");
const { v4: uuidv4 } = require("uuid");
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
    const order = await Orders.create(orderData, { transaction });
    await OrderStatuses.create(
      { parentId: order.id, new: true },
      { transaction }
    );

    await handleOrderDeads(orderDeads, order.id, transaction);
    await handleOrderMaterials(orderMaterials, order.id, transaction, false);
    await handleOrderWorks(orderWorks, order.id, transaction);
    await handleOrderServices(orderServices, order.id, transaction);

    // Проверяем и создаем недостающие материалы
    for (const material of orderMaterials) {
      if (material.deficit > 0) {
        await createMissingMaterial(material, material.deficit, transaction);
      }
    }

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

    await transaction.commit();
    sendOrderUpdateMessage(`📦 Новый заказ создан: ${order.name}`, "orders");
    return { success: true, order };
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

    throw error;
  }
}
async function getOrders(query) {
  try {
    const {
      status,
      startDate,
      endDate,
      search,
      storeAddress,
      page = 1,
      per_page = 10,
    } = query;
    const where = {};
    const limit = parseInt(per_page) || 10;
    const currentPage = Math.max(1, parseInt(page) || 1);
    let offset = (currentPage - 1) * limit;

    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);
      where.createdAt = { [Op.between]: [start, end] };
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
    const orders = await Orders.findAll({
      where,
      include: [
        OrderMaterials,
        OrderWorks,
        OrderServices,
        OrderStatuses,
        OrderDeads,
        OrderPhotoLinks,
      ],
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
      include: [
        OrderMaterials,
        OrderWorks,
        OrderServices,
        OrderStatuses,
        OrderDeads,
        OrderPhotoLinks,
      ],
    });
  } catch (error) {
    throw error;
  }
}

async function getNewUploadedFiles(rowsPhotos) {
  const newPhotos = [
    ...(rowsPhotos.carvings || []),
    ...(rowsPhotos.artistic || []),
  ];

  return newPhotos.filter((photo) => photo.key).map((photo) => photo.key);
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
  const transaction = await Orders.sequelize.transaction();
  const newUploadedFiles = await getNewUploadedFiles(rowsPhotos);
  const newPhotoIds = [];

  try {
    const order = await Orders.findByPk(id);
    if (!order) {
      return { success: false, error: "Заказ не найден" };
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

    const newPhotoIdsSet = new Set(
      newPhotos.map((photo) => photo.id).filter(Boolean)
    );

    const photosToDelete = oldPhotos.filter(
      (photo) => !newPhotoIdsSet.has(photo.id)
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

      const photoId = photo.id || uuidv4();
      newPhotoIds.push(photoId);

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
        { transaction }
      );
    }

    await transaction.commit();

    sendOrderUpdateMessage(`✏️ Заказ #${order.name} обновлен`, "orders");
    return { success: true, order };
  } catch (error) {
    console.error("❌ Ошибка при обновлении заказа:", error);

    for (const fileKey of newUploadedFiles) {
      try {
        await deleteFileFromS3(fileKey);
      } catch (s3Error) {
        console.error(`⚠️ Ошибка удаления фото ${fileKey} из S3:`, s3Error);
      }
    }

    if (newPhotoIds.length > 0) {
      try {
        await OrderPhotoLinks.destroy({
          where: { id: newPhotoIds },
        });
      } catch (dbError) {
        console.error("⚠️ Ошибка удаления записей OrderPhotoLinks:", dbError);
      }
    }

    return { success: false, error: "Ошибка при обновлении заказа" };
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

    await returnMaterialsToWarehouse(orderMaterials, transaction);
    await updateMaterialsDeficit(orderMaterials, transaction);
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

    await Orders.destroy({ where: { id: orderId }, transaction });
    sendOrderUpdateMessage(`🗑️ Заказ #${order.name} удален`, "orders");
    await transaction.commit();
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
  updateOrder,
  deleteOrder,
};
