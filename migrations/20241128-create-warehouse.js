"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Warehouses", {
      id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      name: Sequelize.STRING,
      length: Sequelize.STRING,
      width: Sequelize.STRING,
      thickness: Sequelize.STRING,
      priceM2: Sequelize.STRING,
      price: Sequelize.STRING,
      earnings: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      weight: Sequelize.STRING,
      quantity: Sequelize.STRING,
      defective: Sequelize.STRING,

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
    await queryInterface.dropTable("Warehouses");
  },
};
