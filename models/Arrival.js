const { Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const Arrival = sequelize.define("Arrival", {
    id: {
      type: Sequelize.CHAR(36),
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },

    materialId: Sequelize.CHAR(36),
    name: Sequelize.STRING,
    length: Sequelize.STRING,
    width: Sequelize.STRING,
    thickness: Sequelize.STRING,
    priceM2: Sequelize.STRING,
    price: Sequelize.STRING,
    weight: Sequelize.STRING,
    quantity: Sequelize.STRING,
    defective: Sequelize.STRING,

    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  // Arrival.associate = (models) => {
  //   Arrival.belongsTo(models.Warehouse, { foreignKey: "warehouseId" });
  // };

  return Arrival;
};
