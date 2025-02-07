"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("Stores", [
      {
        id: "1a1b1c1d-1234-5678-9101-1a1b1c1d1e1f",
        name: "Космическая 63",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Stores", null, {});
  },
};
