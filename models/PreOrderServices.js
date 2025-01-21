const { Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const PreOrderServices = sequelize.define("PreOrderServices", {
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

    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  PreOrderServices.associate = (models) => {
    PreOrderServices.belongsTo(models.PreOrders, {
      foreignKey: "parentId",
    });
  };

  return PreOrderServices;
};
