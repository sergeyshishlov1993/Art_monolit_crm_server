"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("OrderDeads", {
      id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      parentId: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: "Orders",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      deadName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      deadSecondName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      deadSurName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      deadDateDeath: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      deadDateBirth: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("OrderDeads");
  },
};
