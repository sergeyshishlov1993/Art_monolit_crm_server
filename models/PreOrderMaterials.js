const { Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const PreOrderMaterials = sequelize.define("PreOrderMaterials", {
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
    quantity: Sequelize.FLOAT,
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  PreOrderMaterials.associate = (models) => {
    PreOrderMaterials.belongsTo(models.PreOrders, {
      foreignKey: "parentId",
    });
  };

  return PreOrderMaterials;
};
