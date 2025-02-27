const { models } = require("../models/index");
const { Warehouse, Materials, OrderMaterials } = models;

async function createCustomMaterials(material, transaction) {
  const existingMaterial = await Materials.findOne({
    where: { name: material.name },
    transaction,
  });

  if (existingMaterial) {
    const oldQuantity = parseFloat(existingMaterial.quantity) || 0;
    const newQuantity = parseFloat(material.quantity) || 0;

    // if (oldQuantity === newQuantity) {
    //   return existingMaterial;
    // }

    // const difference = newQuantity - oldQuantity;
    // existingMaterial.quantity += difference;

    existingMaterial.quantity += newQuantity;

    if (existingMaterial.quantity < 0) existingMaterial.quantity = 0;

    existingMaterial.isCreateMenedger = true;
    await existingMaterial.save({ transaction });
    return existingMaterial;
  } else {
    const createdMaterial = await Materials.create(
      {
        id: material.id,
        name: material.name,
        length: material.length || null,
        width: material.width || null,
        thickness: material.thickness || null,
        price: material.price || 0,
        priceM2: material.priceM2,
        weight: material.weight,
        quantity: material.quantity,
        isCreateMenedger: true,
      },
      { transaction }
    );
    return createdMaterial;
  }
}

async function createMissingMaterial(material, deficit, transaction) {
  const existingMaterial = await Materials.findOne({
    where: { name: material.name },
    transaction,
  });
  if (!existingMaterial) {
    await Materials.create(
      {
        id: material.id,
        name: material.name,
        length: material.length || null,
        width: material.width || null,
        thickness: material.thickness || null,
        price: material.price || 0,
        priceM2: material.priceM2,
        weight: material.weight,
        quantity: deficit,
        isCreateMenedger: false,
      },
      { transaction }
    );
  } else {
    existingMaterial.quantity += deficit;
    await existingMaterial.save({ transaction });
  }
}

async function takeAwayQuantityMaterials(orderMaterials, transaction) {
  try {
    for (const material of orderMaterials) {
      const existingMaterial = await Materials.findOne({
        where: { name: material.name },
        transaction,
      });

      if (!existingMaterial) {
        console.warn(`⚠️ Материал "${material.name}" не найден в базе`);
        continue;
      }

      existingMaterial.quantity -= parseFloat(material.quantity) || 0;

      if (existingMaterial.quantity <= 0) {
        await Materials.destroy({
          where: { name: material.name },
          transaction,
        });
      } else {
        await existingMaterial.save({ transaction });
      }
    }
  } catch (error) {
    console.error("❌ Ошибка при изменении количества материалов:", error);
    throw error;
  }
}

async function returnMaterialsToWarehouse(orderMaterials, transaction) {
  for (const material of orderMaterials) {
    if (material.isCreatedMenedger) continue;

    const warehouseItem = await Warehouse.findByPk(material.warehouseId, {
      transaction,
    });
    if (!warehouseItem) {
      console.warn(
        `Складський товар з ID ${material.warehouseId} не знайдено для матеріалу ${material.name}`
      );
      continue;
    }
    const returnableQuantity =
      parseFloat(material.quantity) - parseFloat(material.deficit || 0);
    warehouseItem.quantity += returnableQuantity;
    await warehouseItem.save({ transaction });
  }
}

async function updateMaterialsDeficit(orderMaterials, transaction) {
  await takeAwayQuantityMaterials(orderMaterials, transaction);

  for (const material of orderMaterials) {
    if (material.isCreatedMenedger) continue;
    if (material.deficit && material.deficit > 0) {
      const existingMaterial = await Materials.findByPk(material.warehouseId, {
        transaction,
      });
      if (existingMaterial) {
        existingMaterial.quantity -= material.deficit;
        if (existingMaterial.quantity < 0) existingMaterial.quantity = 0;
        await existingMaterial.save({ transaction });

        if (existingMaterial.quantity === 0) {
          await Materials.destroy({
            where: { id: material.warehouseId },
            transaction,
          });
        }
      } else {
        console.warn(
          `Матеріал з ID ${material.warehouseId} не знайдено в таблиці Materials`
        );
      }
    }
  }
}

async function deleteCustomMaterials(orderMaterials, transaction) {
  for (const material of orderMaterials) {
    if (material.isCreatedMenedger) {
      await Materials.destroy({
        where: { name: material.name },
        transaction,
      });
    }
  }
}

async function handleOrderMaterials(
  orderMaterials,
  parentId,
  transaction,
  isUpdate = false
) {
  if (!orderMaterials?.length) return;

  if (isUpdate) {
    const oldMaterials = await OrderMaterials.findAll({
      where: { parentId },
      transaction,
    });

    await returnMaterialsToWarehouse(oldMaterials, transaction);
    await updateMaterialsDeficit(oldMaterials, transaction);

    await OrderMaterials.destroy({ where: { parentId }, transaction });
  }

  for (const material of orderMaterials) {
    if (!material.name || !parseFloat(material.quantity)) continue;

    if (material.isCreatedMenedger) {
      await createCustomMaterials(material, transaction);
      await OrderMaterials.upsert(
        { ...material, deficit: 0, parentId, warehouseId: null },
        { transaction }
      );
    } else {
      const warehouseItem = await Warehouse.findByPk(material.warehouseId, {
        transaction,
      });
      if (!warehouseItem)
        throw new Error(
          `Складський товар з ID ${material.warehouseId} не знайдено`
        );

      let deficit = 0;
      if (warehouseItem.quantity >= material.quantity) {
        warehouseItem.quantity -= material.quantity;
      } else {
        deficit = material.quantity - warehouseItem.quantity;
        warehouseItem.quantity = 0;
        await createMissingMaterial(warehouseItem, deficit, transaction);
      }
      await warehouseItem.save({ transaction });

      await OrderMaterials.upsert(
        { ...material, deficit, parentId },
        { transaction }
      );
    }
  }
}

module.exports = {
  handleOrderMaterials,
  deleteCustomMaterials,
  updateMaterialsDeficit,
  createMissingMaterial,
  returnMaterialsToWarehouse,
  takeAwayQuantityMaterials,
};
