const { Router } = require("express");
const router = Router();

const { models } = require("../models/index");
const { PreOrders, PreOrderMaterials, PreOrderServices, PreOrderWorks } =
  models;
const { Op } = require("sequelize");
async function handlePreOrderItems(items, parentId, transaction, Model) {
  if (items && items.length > 0) {
    for (const item of items) {
      const { quantity, ...rest } = item;

      await Model.create(
        {
          ...rest,
          quantity: quantity ?? 1,
          parentId,
        },
        { transaction }
      );
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

    if (status) {
      where[status] = true;
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

    const totalOrders = await PreOrders.count({ where });

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

    const orders = await PreOrders.findAll({
      where,
      include: [
        { model: models.PreOrderMaterials },
        { model: models.PreOrderWorks },
        { model: models.PreOrderServices },
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
    console.error("❌ Ошибка при получении предзаказов:", error);
    res.status(500).json({ message: "Ошибка при получении предзаказов" });
  }
});

// router.get("/", async (req, res) => {
//   const { status, startDate, endDate, search } = req.query;

//   try {
//     const where = {};

//     if (status) {
//       where[status] = true;
//     }

//     if (startDate || endDate) {
//       where.createdAt = {};
//       if (startDate) {
//         where.createdAt[Op.gte] = new Date(startDate);
//       }
//       if (endDate) {
//         where.createdAt[Op.lte] = new Date(endDate);
//       }
//     }

//     // Пошук
//     if (search) {
//       where[Op.or] = [{ phone: { [Op.like]: `%${search}%` } }];
//     }

//     const orders = await PreOrders.findAll({
//       where,
//       include: [
//         {
//           model: models.PreOrderMaterials,
//         },
//         {
//           model: models.PreOrderWorks,
//         },
//         {
//           model: models.PreOrderServices,
//         },
//       ],
//     });

//     res.status(200).json({
//       message: "Успешно (Заказы)",
//       orders,
//     });
//   } catch (error) {
//     console.error("Ошибка при обновлении данных:", error);
//     res.status(500).json({ message: "Ошибка при обновлении данных" });
//   }
// });

router.get("/:id", async (req, res) => {
  const { id: orderId } = req.params;

  try {
    const order = await PreOrders.findOne({
      where: { id: orderId },
      include: [
        {
          model: models.PreOrderMaterials,
        },
        {
          model: models.PreOrderWorks,
        },
        {
          model: models.PreOrderServices,
        },
      ],
    });

    if (!order) {
      return res
        .status(404)
        .json({ message: `Просчет с ID ${orderId} не найден` });
    }

    res.status(200).json({
      message: `Успешно (Просчет, ${orderId})`,
      order,
    });
  } catch (error) {
    console.error("Ошибка при получении данных заказа:", error);
    res.status(500).json({ message: "Ошибка при получении данных заказа" });
  }
});

router.post("/create-preorder", async (req, res) => {
  const { preOrderData, preOrderMaterials, preOrderServices, preOrderWorks } =
    req.body;

  const transaction = await PreOrders.sequelize.transaction();

  try {
    const preOrder = await PreOrders.create(preOrderData, { transaction });

    await handlePreOrderItems(
      preOrderMaterials,
      preOrder.id,
      transaction,
      PreOrderMaterials
    );

    await handlePreOrderItems(
      preOrderServices,
      preOrder.id,
      transaction,
      PreOrderServices
    );

    await handlePreOrderItems(
      preOrderWorks,
      preOrder.id,
      transaction,
      PreOrderWorks
    );

    await transaction.commit();

    res.status(200).json({
      message: "Успішно створено передзамовлення",
      preOrder,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Помилка при створенні передзамовлення:", error);
    res.status(500).json({ message: "Помилка при створенні передзамовлення" });
  }
});

router.put("/update-preorder/:id", async (req, res) => {
  const { id } = req.params;
  const { preOrderData, preOrderMaterials, preOrderServices, preOrderWorks } =
    req.body;

  const transaction = await PreOrders.sequelize.transaction();

  try {
    const preOrder = await PreOrders.findByPk(id, { transaction });

    if (!preOrder) {
      await transaction.rollback();
      return res.status(404).json({ message: "Передзамовлення не знайдено" });
    }

    await preOrder.update(preOrderData, { transaction });

    await PreOrderMaterials.destroy({ where: { parentId: id }, transaction });
    await PreOrderServices.destroy({ where: { parentId: id }, transaction });
    await PreOrderWorks.destroy({ where: { parentId: id }, transaction });

    await handlePreOrderItems(
      preOrderMaterials,
      id,
      transaction,
      PreOrderMaterials
    );
    await handlePreOrderItems(
      preOrderServices,
      id,
      transaction,
      PreOrderServices
    );
    await handlePreOrderItems(preOrderWorks, id, transaction, PreOrderWorks);

    await transaction.commit();

    res.status(200).json({
      message: "Передзамовлення успішно оновлено",
      preOrder,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Помилка при оновленні передзамовлення:", error);
    res.status(500).json({ message: "Помилка при оновленні передзамовлення" });
  }
});

router.put("/update-preorder-status/:id", async (req, res) => {
  const { id } = req.params;

  const transaction = await PreOrders.sequelize.transaction();

  try {
    const preOrder = await PreOrders.findByPk(id, { transaction });

    if (!preOrder) {
      await transaction.rollback();
      return res.status(404).json({ message: "Передзамовлення не знайдено" });
    }

    await preOrder.update({ isDraft: false, isPublic: true }, { transaction });

    await transaction.commit();

    res.status(200).json({
      message: "Статус передзамовлення успішно оновлено",
      preOrder,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Помилка при оновленні статусу передзамовлення:", error);
    res.status(500).json({ message: "Помилка при оновленні статусу" });
  }
});

router.delete("/remove-order/:orderId", async (req, res) => {
  const { orderId } = req.params;

  const transaction = await PreOrders.sequelize.transaction();

  try {
    await PreOrderMaterials.destroy({
      where: { parentId: orderId },
      transaction,
    });

    await PreOrderServices.destroy({
      where: { parentId: orderId },
      transaction,
    });

    await PreOrderWorks.destroy({
      where: { parentId: orderId },
      transaction,
    });

    await PreOrders.destroy({ where: { id: orderId }, transaction });

    await transaction.commit();

    res.status(200).json({
      message: "Замовлення успішно видалено",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Помилка при видаленні замовлення:", error);
    res.status(500).json({ message: "Помилка при видаленні замовлення" });
  }
});

module.exports = router;
