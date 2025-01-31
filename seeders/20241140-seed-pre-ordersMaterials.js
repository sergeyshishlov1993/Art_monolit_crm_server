"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert("PreOrderMaterials", [
      {
        id: "223e4567-e89b-12d3-a456-426614174001",
        parentId: "123e4567-e89b-12d3-a456-426614174000",
        warehouseId: "b1f8c91b-ff2f-47c4-9b4e-8d789b2f1234",
        name: "Material A",
        price: "50.00",
        quantity: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("PreOrderMaterials", null, {});
  },
};
