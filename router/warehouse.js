const { Router } = require("express");
const router = Router();

const { models } = require("../models/index");
const { Warehouse, Defective } = models;
const { Op } = require("sequelize");

router.get("/", async (req, res) => {
  const { search } = req.query;

  try {
    const where = {};

    if (search) {
      where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }];
    }

    const warehouse = await Warehouse.findAll({ where });
    res.status(200).json({
      message: "Успешно (Склад)",
      warehouse,
    });
  } catch (error) {
    console.error("Ошибка при обновлении данных:", error);
    res.status(500).json({ message: "Ошибка при обновлении данных" });
  }
});

router.post("/create", async (req, res) => {
  const transaction = await Warehouse.sequelize.transaction();

  try {
    const { item } = req.body;
    const newItem = await Warehouse.create(item, { transaction });

    await transaction.commit();

    res.status(201).json({
      message: "Товар успешно создан!",
      item: newItem,
    });
  } catch (error) {
    await transaction.rollback();

    console.error("Ошибка при создании товара:", error);
    res.status(500).json({
      message: "Ошибка при создании товара",
      error: error.message,
    });
  }
});

router.put("/update/:id", async (req, res) => {
  const transaction = await Warehouse.sequelize.transaction();

  try {
    const { id } = req.params;
    const { item } = req.body;

    const existingItem = await Warehouse.findByPk(id);

    if (!existingItem) {
      await transaction.rollback();
      return res.status(404).json({
        message: "Товар не найден",
      });
    }

    const isDefective = item.defective || 0;

    const updatedItem = await existingItem.update(item, { transaction });

    const defectiveRecord = await Defective.findOne({
      where: { warehouseId: id },
      transaction,
    });

    if (isDefective > 0) {
      if (!defectiveRecord) {
        await Defective.create(
          {
            warehouseId: id,
            name: updatedItem.name,
            length: updatedItem.length,
            width: updatedItem.width,
            thickness: updatedItem.thickness,
            priceM2: updatedItem.priceM2,
            price: updatedItem.price,
            weight: updatedItem.weight,
            quantity: isDefective,
          },
          { transaction }
        );
      } else if (defectiveRecord.quantity !== isDefective) {
        await defectiveRecord.update(
          {
            quantity: isDefective,
          },
          { transaction }
        );
      }
    } else if (defectiveRecord) {
      await defectiveRecord.destroy({ transaction });
    }

    await transaction.commit();

    res.status(200).json({
      message: "Товар успешно обновлён!",
      item: updatedItem,
    });
  } catch (error) {
    await transaction.rollback();

    console.error("Ошибка при обновлении товара:", error);
    res.status(500).json({
      message: "Ошибка при обновлении товара",
      error: error.message,
    });
  }
});

router.delete("/delete/:id", async (req, res) => {
  const transaction = await Warehouse.sequelize.transaction();

  try {
    const { id } = req.params;

    const existingItem = await Warehouse.findByPk(id);

    if (!existingItem) {
      await transaction.rollback();
      return res.status(404).json({
        message: "Товар не найден",
      });
    }

    await existingItem.destroy({ transaction });

    await transaction.commit();

    res.status(200).json({
      message: "Товар успешно удалён!",
    });
  } catch (error) {
    await transaction.rollback();

    console.error("Ошибка при удалении товара:", error);
    res.status(500).json({
      message: "Ошибка при удалении товара",
      error: error.message,
    });
  }
});

module.exports = router;
