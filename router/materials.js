const { Router } = require("express");
const router = Router();

const { models } = require("../models/index");
const { Materials, Arrival } = models;
const { Op } = require("sequelize");

router.get("/", async (req, res) => {
  const { search } = req.query;

  try {
    const where = {};

    if (search) {
      where[Op.or] = [{ name: { [Op.like]: `%${search}%` } }];
    }

    const materials = await Materials.findAll({ where });
    res.status(200).json({
      message: "Успешно (Заказ материалов)",
      materials,
    });
  } catch (error) {
    console.error("Ошибка при обновлении данных:", error);
    res.status(500).json({ message: "Ошибка при обновлении данных" });
  }
});

router.post("/create", async (req, res) => {
  const { materialsData } = req.body;

  const transaction = await Materials.sequelize.transaction();

  try {
    const materials = await Materials.create(materialsData, { transaction });

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

router.post("/transfer-to-arrival", async (req, res) => {
  const transaction = await Materials.sequelize.transaction();

  try {
    const materials = await Materials.findAll();

    if (materials.length === 0) {
      return res.status(404).json({ message: "Нет данных для переноса" });
    }

    for (const material of materials) {
      const arrivalData = {
        materialId: material.id,
        name: material.name,
        length: material.length,
        width: material.width,
        thickness: material.thickness,
        weight: material.weight,
        priceM2: material.priceM2,
        price: material.price,
        quantity: material.quantity,
        defective: 0,
        createdAt: material.createdAt,
        updatedAt: material.updatedAt,
      };

      const [arrival, created] = await Arrival.findOrCreate({
        where: { materialId: material.id },
        defaults: arrivalData,
        transaction,
      });

      if (!created) {
        await arrival.update(arrivalData, { transaction });
      }
    }

    await transaction.commit();

    res.status(200).json({
      message: "Данные успешно перенесены или обновлены в Arrival",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Ошибка при переносе данных:", error);
    res.status(500).json({ message: "Ошибка при переносе данных" });
  }
});

router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { materialsData } = req.body;

  const transaction = await Materials.sequelize.transaction();

  try {
    const material = await Materials.findByPk(id);

    if (!material) {
      await transaction.rollback();
      return res.status(404).json({ message: "Материал не найден" });
    }

    const updatedMaterial = await material.update(materialsData, {
      transaction,
    });

    await transaction.commit();

    res.status(200).json({
      message: "Материал успешно обновлён",
      material: updatedMaterial,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Ошибка при обновлении:", error);
    res.status(500).json({ message: "Ошибка при обновлении" });
  }
});

router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;

  const transaction = await Materials.sequelize.transaction();

  try {
    const material = await Materials.findByPk(id);

    if (!material) {
      await transaction.rollback();
      return res.status(404).json({ message: "Материал не найден" });
    }

    await material.destroy({ transaction });

    await transaction.commit();

    res.status(200).json({ message: "Материал успешно удалён" });
  } catch (error) {
    await transaction.rollback();
    console.error("Ошибка при удалении:", error);
    res.status(500).json({ message: "Ошибка при удалении" });
  }
});

router.delete("/clear", async (req, res) => {
  const transaction = await Materials.sequelize.transaction();

  try {
    await Materials.destroy({ where: {}, transaction });

    await transaction.commit();

    res.status(200).json({
      message: "Таблица Materials успешно очищена",
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
