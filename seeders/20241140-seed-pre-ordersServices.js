"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert("PreOrderServices", [
      {
        id: "323e4567-e89b-12d3-a456-426614174002",
        parentId: "123e4567-e89b-12d3-a456-426614174000",
        name: "Service A",
        price: "100.00",

        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("PreOrderServices", null, {});
  },
};
