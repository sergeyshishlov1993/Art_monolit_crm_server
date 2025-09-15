const { Sequelize, BOOLEAN } = require("sequelize");

module.exports = (sequelize) => {
  const OrderMaterials = sequelize.define("OrderMaterials", {
    id: {
      type: Sequelize.CHAR(36),
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    parentId: {
      type: Sequelize.CHAR(36),
      allowNull: false,
    },
    warehouseId: { type: Sequelize.CHAR(36), allowNull: true },
    name: Sequelize.STRING,
    price: Sequelize.STRING,
    length: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    width: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    thickness: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    quantity: Sequelize.FLOAT,
    deficit: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
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

  OrderMaterials.associate = (models) => {
    OrderMaterials.belongsTo(models.Orders, { foreignKey: "parentId" });
  };

  return OrderMaterials;
};
