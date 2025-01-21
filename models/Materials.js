const { Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const Materials = sequelize.define("Materials", {
    id: {
      type: Sequelize.CHAR(36),
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    warehouseId: { type: Sequelize.CHAR(36), allowNull: true },
    length: Sequelize.STRING,
    name: Sequelize.STRING,
    width: Sequelize.STRING,
    thickness: Sequelize.STRING,
    priceM2: Sequelize.STRING,
    price: Sequelize.STRING,
    weight: Sequelize.STRING,
    quantity: Sequelize.STRING,
    defective: Sequelize.STRING,
    isCreateMenedger: Sequelize.BOOLEAN,

    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  Materials.associate = (models) => {
    Materials.belongsTo(models.Arrival, { foreignKey: "arrivalId" });
  };

  return Materials;
};
