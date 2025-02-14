// // services/materialService.js
// const { models } = require("../models/index");
// const { Warehouse, Materials, OrderMaterials } = models;
// const { sendLowStockNotification } = require("./notificationService");

// async function createCustomMaterials(material, transaction) {
//   await Materials.create(
//     {
//       id: material.id,
//       name: material.name,
//       length: material.length || null,
//       width: material.width || null,
//       thickness: material.thickness || null,
//       price: material.price || 0,
//       priceM2: material.priceM2,
//       weight: material.weight,
//       quantity: material.quantity,
//       isCreateMenedger: true,
//     },
//     { transaction }
//   );
// }
// async function createMissingMaterial(material, deficit, transaction) {
//   const existingMaterial = await Materials.findOne({
//     where: { name: material.name },
//     transaction,
//   });

//   if (!existingMaterial) {
//     await Materials.create(
//       {
//         id: material.id,
//         name: material.name,
//         length: material.length || null,
//         width: material.width || null,
//         thickness: material.thickness || null,
//         price: material.price || 0,
//         priceM2: material.priceM2,
//         weight: material.weight,
//         quantity: deficit,
//         isCreateMenedger: false,
//       },
//       { transaction }
//     );
//   } else {
//     existingMaterial.quantity += deficit;

//     await existingMaterial.save({ transaction });
//   }
// }

// async function handleOrderMaterials(
//   orderMaterials,
//   parentId,
//   transaction,
//   isUpdate = false
// ) {
//   if (!orderMaterials || orderMaterials.length === 0) return;

//   for (const material of orderMaterials) {
//     const { quantity = 1, warehouseId, ...rest } = material;

//     const parsedQuantity = parseFloat(quantity) || 0;
//     let previousQuantity = 0;

//     if (isUpdate) {
//       const oldOrderMaterials = await OrderMaterials.findAll({
//         where: { parentId },
//       });

//       if (oldOrderMaterials.length !== orderMaterials.length) {
//         const newMaterialIds = orderMaterials.map((item) => String(item.id));

//         const deletedMaterials = oldOrderMaterials.filter(
//           (oldMaterial) => !newMaterialIds.includes(String(oldMaterial.id))
//         );

//         await returnMaterialsToWarehouse(deletedMaterials);
//         await updateMaterialsDeficit(deletedMaterials);
//       }

//       if (oldOrderMaterials.length > 0) {
//         await returnMaterialsToWarehouse(oldOrderMaterials);
//         await updateMaterialsDeficit(orderMaterials);
//       }
//     }

//     if (!material.name || parsedQuantity <= 0) {
//       continue;
//     }

//     if (material.isCreatedMenedger) {
//       await createCustomMaterials(material, transaction);

//       await OrderMaterials.upsert(
//         {
//           ...material,
//           quantity: parsedQuantity,
//           deficit: 0,
//           parentId,
//           warehouseId: null,
//         },
//         { transaction }
//       );
//     } else {
//       const quantityDifference = parsedQuantity - previousQuantity;

//       let deficit = 0;

//       if (warehouseId) {
//         const warehouseItem = await Warehouse.findByPk(warehouseId, {
//           transaction,
//         });

//         if (!warehouseItem) {
//           throw new Error(`Складской товар с ID ${warehouseId} не найден`);
//         }

//         const availableQuantity = parseFloat(warehouseItem.quantity) || 0;

//         if (availableQuantity < 5) {
//           await sendLowStockNotification(
//             `${warehouseItem.name}${warehouseItem.length}X${warehouseItem.width}X${warehouseItem.thickness}`,
//             availableQuantity
//           );
//         }

//         if (quantityDifference > 0) {
//           if (availableQuantity >= quantityDifference) {
//             warehouseItem.quantity -= quantityDifference;
//           } else {
//             deficit = quantityDifference - availableQuantity;
//             warehouseItem.quantity = 0;

//             await createMissingMaterial(warehouseItem, deficit, transaction);
//           }

//           await warehouseItem.save({ transaction });
//         } else if (quantityDifference < 0) {
//           warehouseItem.quantity += Math.abs(quantityDifference);
//           deficit = 0;
//           await warehouseItem.save({ transaction });
//         }
//       }

//       await OrderMaterials.upsert(
//         {
//           ...rest,
//           quantity: parsedQuantity,
//           deficit,
//           parentId,
//           warehouseId,
//         },
//         { transaction }
//       );
//     }
//   }
// }

// async function returnMaterialsToWarehouse(orderMaterials, transaction) {
//   for (const material of orderMaterials) {
//     if (material.isCreatedMenedger) {
//       continue;
//     }

//     const warehouseItem = await Warehouse.findByPk(material.warehouseId, {
//       transaction,
//     });

//     if (warehouseItem) {
//       const returnableQuantity =
//         parseFloat(material.quantity) - parseFloat(material.deficit || 0);

//       warehouseItem.quantity += returnableQuantity;
//       await warehouseItem.save({ transaction });
//     } else {
//       console.warn(
//         `Складской товар с ID ${material.warehouseId} не найден для материала ${material.name}`
//       );
//     }
//   }
// }

// async function updateMaterialsDeficit(orderMaterials, transaction) {
//   for (const material of orderMaterials) {
//     if (material.isCreatedMenedger) {
//       continue;
//     }
//     if (material.deficit && material.deficit > 0) {
//       const existingMaterial = await Materials.findByPk(material.warehouseId, {
//         transaction,
//       });

//       if (existingMaterial) {
//         existingMaterial.quantity -= material.deficit; // Уменьшаем количество
//         if (existingMaterial.quantity < 0) existingMaterial.quantity = 0; // Не допускаем отрицательных значений

//         await existingMaterial.save({ transaction });

//         if (existingMaterial.quantity === 0) {
//           await Materials.destroy({
//             where: {
//               id: material.warehouseId,
//             },
//             transaction,
//           });
//         }
//       } else {
//         console.warn(
//           `Материал с ID ${material.warehouseId} не найден в таблице Materials`
//         );
//       }
//     }
//   }
// }

// async function deleteCustomMaterials(orderMaterials, transaction) {
//   for (const material of orderMaterials) {
//     if (material.isCreatedMenedger) {
//       await Materials.destroy({
//         where: { name: material.name },
//         transaction,
//       });
//     }
//   }
// }

// module.exports = {
//   createMissingMaterial,
//   handleOrderMaterials,
//   returnMaterialsToWarehouse,
//   updateMaterialsDeficit,
//   deleteCustomMaterials,
// };

const { models } = require("../models/index");
const { Warehouse, Materials, OrderMaterials } = models;
const { sendLowStockNotification } = require("./notificationService");

async function createCustomMaterials(material, transaction) {
  // 1) Знаходимо, чи вже є матеріал з таким `name`.
  const existingMaterial = await Materials.findOne({
    where: { name: material.name },
    transaction,
  });

  if (existingMaterial) {
    // 2) Якщо знайдений, порівнюємо кількості:
    const oldQuantity = parseFloat(existingMaterial.quantity) || 0;
    const newQuantity = parseFloat(material.quantity) || 0;

    // Якщо однакові:
    if (oldQuantity === newQuantity) {
      // Нічого не робимо
      return existingMaterial;
    }

    // Якщо різні, визначаємо різницю:
    const difference = newQuantity - oldQuantity;
    existingMaterial.quantity += difference;
    // Якщо вийшли в мінус — підстраховка
    if (existingMaterial.quantity < 0) existingMaterial.quantity = 0;

    // Оскільки це “кастомний” матеріал, збережемо ознаку
    existingMaterial.isCreateMenedger = true;
    await existingMaterial.save({ transaction });
    return existingMaterial;
  } else {
    // 3) Якщо матеріалу з таким name немає, створюємо:
    const createdMaterial = await Materials.create(
      {
        // Якщо у вас id автогенерується — приберіть id: material.id
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
