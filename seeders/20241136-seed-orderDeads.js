"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("OrderDeads", [
      {
        id: "47c70a6f-0a13-492a-a654-b15c90a2295f",
        parentId: "f398ee8a-ed60-4e00-a082-de7a3e2b7930",
        deadName: "John",
        deadSecondName: "Doe",
        deadSurName: "Smith",
        deadDateDeath: "2023-11-29",
        deadDateBirth: "1975-01-01",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("OrderDeads", null, {});
  },
};
