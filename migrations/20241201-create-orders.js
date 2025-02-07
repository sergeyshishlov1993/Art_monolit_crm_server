"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Orders", {
      id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      first_name: Sequelize.STRING,
      second_name: Sequelize.STRING,
      phone: Sequelize.STRING,
      comment: Sequelize.TEXT,
      name: Sequelize.STRING,
      address: Sequelize.STRING,
      prepayment: Sequelize.STRING,
      pay: Sequelize.STRING,
      totalPrice: Sequelize.STRING,
      sale: Sequelize.STRING,
      status: Sequelize.STRING,
      source: Sequelize.STRING,
      store: Sequelize.STRING,
      storeAddress: Sequelize.STRING,
      isPublic: Sequelize.BOOLEAN,
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
    await queryInterface.dropTable("OrderWorks");
    await queryInterface.dropTable("OrderServices");
    await queryInterface.dropTable("OrderDeads");
    await queryInterface.dropTable("Orders");
  },
};
