const { models } = require("../models/index");
const { Warehouse, Materials, OrderMaterials } = models;
const { sendLowStockNotification } = require("./notificationService");

async function createCustomMaterials(material, transaction) {
  const existingMaterial = await Materials.findOne({
    where: { name: material.name },
    transaction,
  });

  if (existingMaterial) {
    const oldQuantity = parseFloat(existingMaterial.quantity) || 0;
    const newQuantity = parseFloat(material.quantity) || 0;

    if (oldQuantity === newQuantity) {
      return existingMaterial;
    }

    const difference = newQuantity - oldQuantity;
    existingMaterial.quantity += difference;

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
  if (!orderMaterials || orderMaterials.length === 0) return;

  if (isUpdate) {
    const oldOrderMaterials = await OrderMaterials.findAll({
      where: { parentId },
      transaction,
    });
    if (oldOrderMaterials.length !== orderMaterials.length) {
      const newMaterialIds = orderMaterials.map((item) => String(item.id));
      const deletedMaterials = oldOrderMaterials.filter(
        (oldMat) => !newMaterialIds.includes(String(oldMat.id))
      );
      await returnMaterialsToWarehouse(deletedMaterials, transaction);
      await updateMaterialsDeficit(deletedMaterials, transaction);
    }
    if (oldOrderMaterials.length > 0) {
      await returnMaterialsToWarehouse(oldOrderMaterials, transaction);
      await updateMaterialsDeficit(oldOrderMaterials, transaction);
    }
  }

  for (const material of orderMaterials) {
    const { quantity = 1, warehouseId, ...rest } = material;
    const parsedQuantity = parseFloat(quantity) || 0;
    if (!material.name || parsedQuantity <= 0) continue;

    if (material.isCreatedMenedger) {
      await createCustomMaterials(material, transaction);
      await OrderMaterials.upsert(
        {
          ...material,
          quantity: parsedQuantity,
          deficit: 0,
          parentId,
          warehouseId: null,
        },
        { transaction }
      );
    } else {
      let deficit = 0;
      if (warehouseId) {
        const warehouseItem = await Warehouse.findByPk(warehouseId, {
          transaction,
        });
        if (!warehouseItem) {
          throw new Error(`Складський товар з ID ${warehouseId} не знайдено`);
        }

        const availableQuantity = parseFloat(warehouseItem.quantity) || 0;
        if (availableQuantity < 5) {
          await sendLowStockNotification(
            `${warehouseItem.name}${warehouseItem.length}X${warehouseItem.width}X${warehouseItem.thickness}`,
            availableQuantity
          );
        }
        if (availableQuantity >= parsedQuantity) {
          // повністю списуємо
          warehouseItem.quantity -= parsedQuantity;
        } else {
          // дефіцит
          deficit = parsedQuantity - availableQuantity;
          warehouseItem.quantity = 0;
          await createMissingMaterial(warehouseItem, deficit, transaction);
        }
        await warehouseItem.save({ transaction });
      }
      await OrderMaterials.upsert(
        {
          ...rest,
          quantity: parsedQuantity,
          deficit,
          parentId,
          warehouseId,
        },
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
};
