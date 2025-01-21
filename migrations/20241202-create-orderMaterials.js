"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("OrderMaterials", {
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
      warehouseId: Sequelize.CHAR(36),
      name: Sequelize.STRING,
      price: Sequelize.STRING,
      quantity: Sequelize.FLOAT,
      isCreatedMenedger: Sequelize.BOOLEAN,

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
    await queryInterface.dropTable("OrderMaterials");
  },
};
