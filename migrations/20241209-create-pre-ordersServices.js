"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("PreOrderServices", {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      parentId: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: "PreOrders",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      name: Sequelize.STRING,
      price: Sequelize.STRING,

      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("PreOrderServices");
  },
};
