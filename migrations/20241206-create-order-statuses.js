"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("OrderStatuses", {
      id: {
        type: Sequelize.CHAR(36),
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
      new: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      layout: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      layout_accepted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      engraving_front: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      engraving_reverse: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      engraving_plate: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      engraving_stand: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      milling: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      concreting: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      laying_tiles: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      installation: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      completed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("OrderStatuses");
  },
};
