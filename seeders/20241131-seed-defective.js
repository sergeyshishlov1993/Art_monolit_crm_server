"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("Defectives", [
      {
        id: "92a6ad43-2ae5-48c4-9db4-e93786ce5a57",
        name: "Арка",
        length: "100",
        width: "50",
        thickness: "10",
        priceM2: "25",
        price: "4",
        weight: "150",
        quantity: "10",

        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "e0688c33-950a-431e-b116-9183c2eb6b46",
        name: "Арка",
        length: "200",
        width: "100",
        thickness: "15",
        priceM2: "40",
        price: "6",
        weight: "300",
        quantity: "5",

        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Defectives", null, {});
  },
};
