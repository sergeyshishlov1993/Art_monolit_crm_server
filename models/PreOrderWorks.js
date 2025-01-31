const { Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const PreOrderWorks = sequelize.define("PreOrderWorks", {
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
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  PreOrderWorks.associate = (models) => {
    PreOrderWorks.belongsTo(models.PreOrders, {
      foreignKey: "parentId",
    });
  };

  return PreOrderWorks;
};
