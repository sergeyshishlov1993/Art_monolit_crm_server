"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("OrderWorks", [
      {
        id: "a6290435-0b32-4f13-a1cb-269a3af8c659",
        parentId: "f398ee8a-ed60-4e00-a082-de7a3e2b7930",
        name: "Портрет",
        price: "200",
        parentTitle: "На стеле",
        createdAt: new Date(),
        updatedAt: new Date(),
      },

      {
        id: "b1234567-8cde-4f13-b1cb-269a3af8d123",
        parentId: "f398ee8a-ed60-4e00-a082-de7a3e2b7930",
        name: "Стихи",
        price: "200",
        parentTitle: "На плите",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("OrderWorks", null, {});
  },
};
