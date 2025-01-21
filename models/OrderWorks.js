const { Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const OrderWorks = sequelize.define(
    "OrderWorks",
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
      parentTitle: Sequelize.STRING,
    },
    {
      timestamps: true,
    }
  );

  OrderWorks.associate = (models) => {
    OrderWorks.belongsTo(models.Orders, { foreignKey: "parentId" });
  };

  return OrderWorks;
};
