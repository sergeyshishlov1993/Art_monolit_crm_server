"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("OrderMaterials", [
      {
        id: "740830f0-2852-47ea-b1f3-56d56874fb34",
        parentId: "f398ee8a-ed60-4e00-a082-de7a3e2b7930",
        warehouseId: "b1f8c91b-ff2f-47c4-9b4e-8d789b2f1234",
        name: "Material 1",
        price: "100",
        quantity: 10,
        deficit: 0,
        isCreatedMenedger: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      {
        id: "om2a1b1c1-d123-4567-8910-1a1b1c1d1e1",
        parentId: "f398ee8a-ed60-4e00-a082-de7a3e2b7930",
        warehouseId: "b1f8c91b-ff2f-47c4-9b4e-8d789b2f1234",
        name: "Material 2",
        price: "150",
        quantity: 1,
        deficit: 0,
        isCreatedMenedger: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("OrderMaterials", null, {});
  },
};
