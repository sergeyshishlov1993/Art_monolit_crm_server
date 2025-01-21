"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("OrderServices", [
      {
        id: "e04e3279-b888-451e-9826-6dd20eed16e4",
        parentId: "f398ee8a-ed60-4e00-a082-de7a3e2b7930",
        name: "Service 1",
        price: "50",

        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("OrderServices", null, {});
  },
};
