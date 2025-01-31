"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("PreOrders", {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      first_name: Sequelize.STRING,
      second_name: Sequelize.STRING,
      phone: Sequelize.STRING,
      comment: Sequelize.TEXT,
      name: Sequelize.STRING,
      address: Sequelize.STRING,
      totalPrice: Sequelize.STRING,
      source: Sequelize.STRING,
      isDraft: Sequelize.BOOLEAN,
      isPublic: Sequelize.BOOLEAN,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("PreOrderMaterials");
    await queryInterface.dropTable("PreOrderServices");
    await queryInterface.dropTable("PreOrderWorks");
    await queryInterface.dropTable("PreOrders");
  },
};
