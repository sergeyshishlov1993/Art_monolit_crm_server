const { Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const Defective = sequelize.define("Defective", {
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
    weight: Sequelize.STRING,
    quantity: Sequelize.STRING,

    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  Defective.associate = (models) => {
    Defective.belongsTo(models.Warehouse, { foreignKey: "warehouseId" });
  };

  return Defective;
};
