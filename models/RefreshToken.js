const { Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const RefreshToken = sequelize.define("RefreshToken", {
    id: {
      type: Sequelize.CHAR(36),
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    token: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    userId: {
      type: Sequelize.CHAR(36),
      allowNull: false,
    },
  });

  RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.User, {
      foreignKey: "userId",
      onDelete: "CASCADE",
    });
  };

  return RefreshToken;
};
