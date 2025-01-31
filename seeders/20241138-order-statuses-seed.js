"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("OrderStatuses", [
      {
        id: "11111111-1111-1111-1111-111111111111",
        parentId: "f398ee8a-ed60-4e00-a082-de7a3e2b7930", // Связь с заказом
        new: true,
        layout: true,
        layout_accepted: false,
        engraving_front: false,
        engraving_reverse: false,
        engraving_plate: false,
        engraving_stand: false,
        milling: false,
        concreting: false,
        laying_tiles: false,
        installation: false,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("OrderStatuses", null, {});
  },
};
