"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("Warehouses", [
      {
        id: "b1f8c91b-ff2f-47c4-9b4e-8d789b2f1234",

        name: "Арка",
        length: "200",
        width: "150",
        thickness: "20",
        priceM2: "50",
        price: "10",
        earnings: 15.5,
        weight: "500",
        quantity: 1,
        defective: "0",

        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "b2f8c91b-ff2f-47c4-9b4e-8d789b2f5678",
        name: "Арка",
        length: "300",
        width: "200",
        thickness: "30",
        priceM2: "70",
        price: "15",
        earnings: 20,
        weight: "800",
        quantity: 5,
        defective: "5",

        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Warehouses", null, {});
  },
};
