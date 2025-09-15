const { models } = require("../models/index");
const { Warehouse, Materials, OrderMaterials } = models;
const { Op } = require("sequelize");

async function findMaterial(material, transaction) {
  return await Materials.findOne({
    where: {
      name: material.name,
      length: material.length || null,
      width: material.width || null,
      thickness: material.thickness || null,
    },
    transaction,
  });
}


async function handleCustomMaterial(material, transaction) {
  const existingMaterial = await findMaterial(material, transaction);
  const newQuantity = parseFloat(material.quantity) || 0;

  if (existingMaterial) {
    existingMaterial.quantity = newQuantity;
    await existingMaterial.save({ transaction });
    return existingMaterial;
  } else {
    return await Materials.create({
      id: material.id || require("crypto").randomUUID(),
      name: material.name,
      length: material.length || null,
      width: material.width || null,
      thickness: material.thickness || null,
      price: material.price || 0,
      priceM2: material.priceM2,
      weight: material.weight,
      quantity: newQuantity,
      isCreateMenedger: true,
    }, { transaction });
  }
}

async function reverseCustomMaterial(orderMaterials, transaction) {
  for (const material of orderMaterials) {
    if (material.isCreatedMenedger) {
      const materialToReverse = await findMaterial(material, transaction);
      if (materialToReverse) {
        const oldQuantity = parseFloat(material.quantity) || 0;
        materialToReverse.quantity -= oldQuantity;
        if (materialToReverse.quantity <= 0) {
          await materialToReverse.destroy({ transaction });
        } else {
          await materialToReverse.save({ transaction });
        }
      }
    }
  }
}

async function createMissingMaterial(material, deficit, transaction) {
  const existingMaterial = await findMaterial(material, transaction);
  if (!existingMaterial) {
    await Materials.create({
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
    }, { transaction });
  } else {
    existingMaterial.quantity += deficit;
    await existingMaterial.save({ transaction });
  }
}

async function returnMaterialsToWarehouse(orderMaterials, transaction) {
  for (const material of orderMaterials) {
    if (material.isCreatedMenedger || !material.warehouseId) continue;
    const warehouseItem = await Warehouse.findByPk(material.warehouseId, { transaction });
    if (!warehouseItem) {
      console.warn(`Складской товар с ID ${material.warehouseId} не найден.`);
      continue;
    }
    const returnableQuantity = parseFloat(material.quantity) - parseFloat(material.deficit || 0);
    warehouseItem.quantity += returnableQuantity;
    await warehouseItem.save({ transaction });
  }
}

async function reverseMaterialDeficit(orderMaterials, transaction) {
  for (const material of orderMaterials) {
    if (material.isCreatedMenedger || !material.warehouseId || !(material.deficit > 0)) continue;
    const deficitMaterial = await Materials.findByPk(material.warehouseId, { transaction });
    if (deficitMaterial) {
      deficitMaterial.quantity -= material.deficit;
      if (deficitMaterial.quantity <= 0) {
        await deficitMaterial.destroy({ transaction });
      } else {
        await deficitMaterial.save({ transaction });
      }
    }
  }
}

async function deleteCustomMaterials(orderMaterials, orderId, transaction) {
  for (const material of orderMaterials) {
    if (material.isCreatedMenedger) {
      const otherOrdersCount = await OrderMaterials.count({
        where: {
          name: material.name,
          length: material.length || null,
          width: material.width || null,
          thickness: material.thickness || null,
          parentId: { [Op.ne]: orderId }
        },
        transaction
      });


      if (otherOrdersCount === 0) {
        const materialToDelete = await findMaterial(material, transaction);
        if (materialToDelete) {
          await materialToDelete.destroy({ transaction });
        }
      }
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
    const oldMaterials = await OrderMaterials.findAll({ where: { parentId }, transaction });
    await returnMaterialsToWarehouse(oldMaterials, transaction);
    await reverseMaterialDeficit(oldMaterials, transaction);
    await reverseCustomMaterial(oldMaterials, transaction);
    await OrderMaterials.destroy({ where: { parentId }, transaction });
  }
  for (const material of orderMaterials) {
    if (!material.name || !(parseFloat(material.quantity) > 0)) continue;
    if (material.isCreatedMenedger) { // Проверяем isCreatedMenedger
      const customMaterial = await handleCustomMaterial(material, transaction);
      await OrderMaterials.create(
          { ...material, deficit: 0, parentId, warehouseId: null, materialId: customMaterial.id },
          { transaction }
      );
    } else {
      if (!material.warehouseId) {
        throw new Error(`Материал "${material.name}" не является кастомным, но у него отсутствует ID склада (warehouseId).`);
      }
      const warehouseItem = await Warehouse.findByPk(material.warehouseId, { transaction });
      if (!warehouseItem) throw new Error(`Складской товар с ID ${material.warehouseId} не найден`);
      let deficit = 0;
      const requiredQty = parseFloat(material.quantity) || 0;
      if (warehouseItem.quantity >= requiredQty) {
        warehouseItem.quantity -= requiredQty;
      } else {
        deficit = requiredQty - warehouseItem.quantity;
        warehouseItem.quantity = 0;
        await createMissingMaterial({ ...warehouseItem.toJSON(), id: warehouseItem.id }, deficit, transaction);
      }
      await warehouseItem.save({ transaction });
      await OrderMaterials.create(
          { ...material, quantity: requiredQty, deficit, parentId },
          { transaction }
      );
    }
  }
}

module.exports = {
  handleOrderMaterials,
  createMissingMaterial,
  returnMaterialsToWarehouse,
  reverseMaterialDeficit,
  reverseCustomMaterial,
  deleteCustomMaterials,
};
