const { Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const PreOrders = sequelize.define("PreOrders", {
    id: {
      type: Sequelize.CHAR(36),
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    first_name: Sequelize.STRING,
    second_name: Sequelize.STRING,
    phone: Sequelize.STRING,
    comment: Sequelize.TEXT,
    name: Sequelize.STRING,
    address: Sequelize.STRING,
    totalPrice: Sequelize.STRING,
    source: Sequelize.STRING,
    isDraft: Sequelize.BOOLEAN,
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

  PreOrders.associate = (models) => {
    PreOrders.hasMany(models.PreOrderMaterials, {
      foreignKey: "parentId",
      onDelete: "CASCADE",
    });
    PreOrders.hasMany(models.PreOrderServices, {
      foreignKey: "parentId",
      onDelete: "CASCADE",
    });
    PreOrders.hasMany(models.PreOrderWorks, {
      foreignKey: "parentId",
      onDelete: "CASCADE",
    });
  };

  return PreOrders;
};
