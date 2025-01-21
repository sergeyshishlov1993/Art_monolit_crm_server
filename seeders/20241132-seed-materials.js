"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("Materials", [
      {
        id: "m1a1b1c1d-1234-5678-9101-1a1b1c1d1e1",
        warehouseId: "b1f8c91b-ff2f-47c4-9b4e-8d789b2f1234",
        name: "Арка",
        length: "300",
        width: "200",
        thickness: "20",
        priceM2: "50",
        price: "8",
        weight: "500",
        quantity: "20",
        defective: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "m2a1b1c1d-1234-5678-9101-1a1b1c1d1e1",
        warehouseId: "b2f8c91b-ff2f-47c4-9b4e-8d789b2f5678",
        name: "Арка",
        length: "400",
        width: "250",
        thickness: "25",
        priceM2: "60",
        price: "10",
        weight: "700",
        quantity: "30",
        defective: "2",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Materials", null, {});
  },
};
