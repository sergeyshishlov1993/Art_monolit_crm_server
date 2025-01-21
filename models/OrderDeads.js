const { Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const OrderDeads = sequelize.define(
    "OrderDeads",
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
      deadName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      deadSecondName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      deadSurName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      deadDateDeath: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      deadDateBirth: {
        type: Sequelize.STRING,
        allowNull: false,
      },
    },
    {
      timestamps: true,
    }
  );

  OrderDeads.associate = (models) => {
    OrderDeads.belongsTo(models.Orders, { foreignKey: "parentId" });
  };

  return OrderDeads;
};
