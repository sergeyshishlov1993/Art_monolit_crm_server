"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert("PreOrderWorks", [
      {
        id: "423e4567-e89b-12d3-a456-426614174003",
        parentId: "123e4567-e89b-12d3-a456-426614174000",
        name: "Work A",
        price: "200.00",
        parentTitle: "На плите",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("PreOrderWorks", null, {});
  },
};
