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

    const existingItem = await Warehouse.findByPk(id, { transaction });

    if (!existingItem) {
      console.log("❌ Товар не найден!");
      await transaction.rollback();
      return res.status(404).json({ message: "Товар не найден" });
    }

    const newDefective = item.defective || 0;

    let defectiveRecord = await Defective.findOne({
      where: { warehouseId: id },
      transaction,
    });

    const previousDefective = existingItem.defective || 0;
    const previousDefectiveQuantity = defectiveRecord
      ? defectiveRecord.quantity
      : 0;

    let defectiveDifference = newDefective - previousDefectiveQuantity;

    await existingItem.update(item, { transaction });

    let newQuantity = existingItem.quantity;

    if (defectiveDifference > 0) {
      if (newQuantity - defectiveDifference < 0) {
        defectiveDifference = newQuantity;
        newQuantity = 0;
      } else {
        newQuantity -= defectiveDifference;
      }
    }

    await existingItem.update(
      {
        quantity: newQuantity,
        defective: newDefective,
      },
      { transaction }
    );

    if (newDefective > 0) {
      if (!defectiveRecord) {
        defectiveRecord = await Defective.create(
          {
            warehouseId: id,
            name: existingItem.name,
            length: existingItem.length,
            width: existingItem.width,
            thickness: existingItem.thickness,
            priceM2: existingItem.priceM2,
            price: existingItem.price,
            weight: existingItem.weight,
            quantity: newDefective,
          },
          { transaction }
        );
      } else {
        await defectiveRecord.update(
          { quantity: newDefective },
          { transaction }
        );
      }
    } else if (defectiveRecord) {
      await defectiveRecord.destroy({ transaction });
    }

    await transaction.commit();

    res.status(200).json({
      message: "Товар успешно обновлён!",
      item: existingItem,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("❌ Ошибка при обновлении товара:", error);
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
