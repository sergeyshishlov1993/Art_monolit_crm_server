const { Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const OrderServices = sequelize.define(
    "OrderServices",
    {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      parentId: {
        type: Sequelize.CHAR(36),
        allowNull: false,
      },
      name: Sequelize.STRING,
      price: Sequelize.STRING,
    },
    {
      timestamps: true,
    }
  );

  OrderServices.associate = (models) => {
    OrderServices.belongsTo(models.Orders, { foreignKey: "parentId" });
  };

  return OrderServices;
};
