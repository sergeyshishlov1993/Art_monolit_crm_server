const { Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const Orders = sequelize.define("Orders", {
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
    prepayment: Sequelize.STRING,
    pay: Sequelize.STRING,
    totalPrice: Sequelize.STRING,
    sale: Sequelize.STRING,
    status: Sequelize.STRING,
    source: Sequelize.STRING,
    store: Sequelize.STRING,

    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  Orders.associate = (models) => {
    Orders.hasMany(models.OrderMaterials, {
      foreignKey: "parentId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    Orders.hasMany(models.OrderWorks, {
      foreignKey: "parentId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    Orders.hasMany(models.OrderServices, {
      foreignKey: "parentId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
    Orders.hasMany(models.OrderDeads, {
      foreignKey: "parentId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    Orders.hasMany(models.OrderStatuses, {
      foreignKey: "parentId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    Orders.hasMany(models.OrderPhotoLinks, {
      foreignKey: "parentId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Orders;
};
