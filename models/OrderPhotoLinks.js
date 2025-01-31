const { Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const OrderPhotoLinks = sequelize.define(
    "OrderPhotoLinks",
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
      fileKey: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      url: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
    },
    {
      timestamps: true,
    }
  );

  OrderPhotoLinks.associate = (models) => {
    OrderPhotoLinks.belongsTo(models.Orders, { foreignKey: "parentId" });
  };

  return OrderPhotoLinks;
};
