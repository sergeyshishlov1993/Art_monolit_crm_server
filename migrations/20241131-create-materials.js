"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Materials", {
      id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      warehouseId: { type: Sequelize.CHAR(36), allowNull: true },
      name: Sequelize.STRING,
      length: Sequelize.STRING,
      width: Sequelize.STRING,
      thickness: Sequelize.STRING,
      priceM2: Sequelize.STRING,
      price: Sequelize.STRING,
      weight: Sequelize.STRING,
      quantity: Sequelize.FLOAT,
      defective: Sequelize.STRING,
      isCreateMenedger: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      arrivalId: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: "Arrivals",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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
    await queryInterface.dropTable("Materials");
  },
};
