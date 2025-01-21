const { Router } = require("express");
const router = Router();

const { models } = require("../models/index");
const { Arrival, Warehouse } = models;
const { Op } = require("sequelize");

router.get("/", async (req, res) => {
  const { search } = req.query;

  try {
    const where = {};

    if (search) {
      where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }];
    }

    const arrival = await Arrival.findAll({ where });
    res.status(200).json({
      message: "Успешно (Приход)",
      arrival,
    });
  } catch (error) {
    console.error("Ошибка при обновлении данных:", error);
    res.status(500).json({ message: "Ошибка при обновлении данных" });
  }
});

router.post("/create", async (req, res) => {
  const { arrivalData } = req.body;

  const transaction = await Arrival.sequelize.transaction();

  try {
    const materials = await Arrival.create(arrivalData, { transaction });

    await transaction.commit();

    res.status(200).json({
      message: "Успішно добавленно",
      materials,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Ошибка при создание:", error);
    res.status(500).json({ message: "Ошибка при создание" });
  }
});

router.post("/transfer-to-warehouse", async (req, res) => {
  const transaction = await Arrival.sequelize.transaction();

  try {
    const arrivals = await Arrival.findAll();

    if (arrivals.length === 0) {
      return res.status(404).json({ message: "Нет данных для переноса" });
    }

    for (const arrival of arrivals) {
      const warehouseData = {
        name: arrival.name,
        length: arrival.length,
        width: arrival.width,
        thickness: arrival.thickness,
        weight: arrival.weight,
        priceM2: arrival.priceM2,
        price: arrival.price,
        quantity: arrival.quantity,
        defective: arrival.defective,
        createdAt: arrival.createdAt,
        updatedAt: arrival.updatedAt,
      };

      const [warehouse, created] = await Warehouse.findOrCreate({
        where: { id: arrival.materialId },
        defaults: warehouseData,
        transaction,
      });

      if (!created) {
        warehouse.quantity =
          Number(warehouse.quantity || 0) + Number(arrival.quantity || 0);
        await warehouse.save({ transaction });
      }
    }

    await transaction.commit();

    res.status(200).json({
      message: "Данные успешно перенесены или обновлены в Warehouse",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Ошибка при переносе данных:", error);
    res.status(500).json({ message: "Ошибка при переносе данных" });
  }
});

router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { arrivalData } = req.body;

  const transaction = await Arrival.sequelize.transaction();

  try {
    const arrival = await Arrival.findByPk(id);

    if (!arrival) {
      await transaction.rollback();
      return res.status(404).json({ message: "Материал не найден" });
    }

    const updatedArrival = await arrival.update(arrivalData, {
      transaction,
    });

    await transaction.commit();

    res.status(200).json({
      message: "Материал успешно обновлён",
      arrival: updatedArrival,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Ошибка при обновлении:", error);
    res.status(500).json({ message: "Ошибка при обновлении" });
  }
});

router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;

  const transaction = await Arrival.sequelize.transaction();

  try {
    const arrival = await Arrival.findByPk(id);

    if (!arrival) {
      await transaction.rollback();
      return res.status(404).json({ message: "Материал не найден" });
    }

    // Удаляем запись
    await arrival.destroy({ transaction });

    await transaction.commit();

    res.status(200).json({ message: "Материал успешно удалён" });
  } catch (error) {
    await transaction.rollback();
    console.error("Ошибка при удалении:", error);
    res.status(500).json({ message: "Ошибка при удалении" });
  }
});

router.delete("/clear", async (req, res) => {
  const transaction = await Arrival.sequelize.transaction();

  try {
    await Arrival.destroy({ where: {}, transaction });

    await transaction.commit();

    res.status(200).json({
      message: "Таблица Arrival успешно очищена",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Ошибка при очистке таблицы:", error);
    res.status(500).json({
      message: "Ошибка при очистке таблицы",
    });
  }
});

module.exports = router;
