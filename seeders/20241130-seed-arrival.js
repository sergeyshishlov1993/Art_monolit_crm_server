"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("Arrivals", [
      {
        id: "1a1b1c1d-1234-5678-9101-1a1b1c1d1e1f",
        materialId: "m1a1b1c1d-1234-5678-9101-1a1b1c1d1e1",
        name: "Арка",
        length: "100",
        width: "50",
        thickness: "10",
        priceM2: "30",
        price: "5",
        weight: "200",
        quantity: "50",
        defective: "0",

        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Arrivals", null, {});
  },
};
