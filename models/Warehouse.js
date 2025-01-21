const { Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const Warehouse = sequelize.define("Warehouse", {
    id: {
      type: Sequelize.CHAR(36),
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
      allowNull: true,
      validate: {
        min: 0,
        max: 1000,
      },
      defaultValue: 0,
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

  return Warehouse;
};
