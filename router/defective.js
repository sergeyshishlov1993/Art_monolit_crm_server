const { Router } = require("express");
const router = Router();

const { models } = require("../models/index");
const { Defective, Warehouse } = models;
const { Op } = require("sequelize");

router.get("/", async (req, res) => {
  const { search } = req.query;

  try {
    const where = {};

    if (search) {
      where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }];
    }

    const defective = await Defective.findAll({ where });
    res.status(200).json({
      message: "Успешно (Брак)",
      defective,
    });
  } catch (error) {
    console.error("Ошибка при обновлении данных:", error);
    res.status(500).json({ message: "Ошибка при обновлении данных" });
  }
});

// router.put("/update-quantity/:id", async (req, res) => {
//   const transaction = await Defective.sequelize.transaction();

//   try {
//     const { id } = req.params;
//     const { quantity } = req.body;

//     const defectiveItem = await Defective.findByPk(id);

//     if (!defectiveItem) {
//       await transaction.rollback();
//       return res.status(404).json({ message: "Запись не найдена" });
//     }

//     defectiveItem.quantity = quantity;
//     await defectiveItem.save({ transaction });

//     await transaction.commit();
//     res.status(200).json({
//       message: "Количество успешно обновлено",
//       defectiveItem,
//     });
//   } catch (error) {
//     await transaction.rollback();
//     console.error("Ошибка при обновлении количества:", error);
//     res.status(500).json({ message: "Ошибка при обновлении количества" });
//   }
// });

router.put("/update-quantity/:id", async (req, res) => {
  const transaction = await Defective.sequelize.transaction();

  try {
    const { id } = req.params;
    const { quantity } = req.body;

    const defectiveItem = await Defective.findByPk(id, { transaction });

    if (!defectiveItem) {
      await transaction.rollback();
      return res.status(404).json({ message: "Запись не найдена" });
    }

    const warehouseItem = await Warehouse.findByPk(defectiveItem.warehouseId, {
      transaction,
    });

    if (!warehouseItem) {
      await transaction.rollback();
      return res.status(404).json({ message: "Склад не найден" });
    }

    const previousDefective = defectiveItem.quantity;
    let warehouseStock = warehouseItem.quantity;

    let newDefectiveQuantity = quantity;
    let newWarehouseQuantity = warehouseStock;

    if (quantity > previousDefective) {
      const additionalDefective = quantity - previousDefective;

      if (warehouseStock >= additionalDefective) {
        newWarehouseQuantity -= additionalDefective;
      } else {
        newWarehouseQuantity = 0;
      }
    } else if (quantity < previousDefective) {
      const returnToStock = previousDefective - quantity;
      newWarehouseQuantity += returnToStock;
    }

    defectiveItem.quantity = newDefectiveQuantity;
    warehouseItem.quantity = newWarehouseQuantity;
    warehouseItem.defective = newDefectiveQuantity;

    await defectiveItem.save({ transaction });
    await warehouseItem.save({ transaction });

    await transaction.commit();

    res.status(200).json({
      message: "Количество успешно обновлено",
      defectiveItem,
      warehouseItem,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Ошибка при обновлении количества:", error);
    res.status(500).json({ message: "Ошибка при обновлении количества" });
  }
});

// router.put("/update-quantity/:id", async (req, res) => {
//   const transaction = await Defective.sequelize.transaction();

//   try {
//     const { id } = req.params;
//     const { quantity } = req.body;

//     console.log("🔹 Получаем запись Defective ID:", id);
//     const defectiveItem = await Defective.findByPk(id, { transaction });

//     if (!defectiveItem) {
//       await transaction.rollback();
//       return res.status(404).json({ message: "Запись не найдена" });
//     }

//     const warehouseItem = await Warehouse.findByPk(defectiveItem.warehouseId, {
//       transaction,
//     });

//     if (!warehouseItem) {
//       await transaction.rollback();
//       return res.status(404).json({ message: "Склад не найден" });
//     }

//     const previousQuantity = defectiveItem.quantity;
//     const defectiveDifference = quantity - previousQuantity;

//     if (quantity > 0) {
//       defectiveItem.quantity = quantity;
//       await defectiveItem.save({ transaction });
//     } else {
//       await defectiveItem.destroy({ transaction });
//       console.log("✅ Удалена запись Defective, так как брака больше нет");
//     }

//     warehouseItem.defective = quantity > 0 ? quantity : 0;
//     await warehouseItem.save({ transaction });

//     await transaction.commit();

//     res.status(200).json({
//       message: "Количество успешно обновлено",
//       defectiveItem,
//     });
//   } catch (error) {
//     await transaction.rollback();
//     res.status(500).json({ message: "Ошибка при обновлении количества" });
//   }
// });

router.delete("/delete/:id", async (req, res) => {
  const transaction = await Defective.sequelize.transaction();

  try {
    const { id } = req.params;

    const defectiveItem = await Defective.findByPk(id);

    if (!defectiveItem) {
      await transaction.rollback();
      return res.status(404).json({ message: "Запись не найдена" });
    }

    // Удаляем запись
    await defectiveItem.destroy({ transaction });

    await transaction.commit();
    res.status(200).json({ message: "Запись успешно удалена" });
  } catch (error) {
    await transaction.rollback();
    console.error("Ошибка при удалении записи:", error);
    res.status(500).json({ message: "Ошибка при удалении записи" });
  }
});

module.exports = router;
