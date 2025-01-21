const { Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const Permission = sequelize.define("Permission", {
    id: {
      type: Sequelize.CHAR(36),
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    name: Sequelize.STRING,
    key: Sequelize.STRING,
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  return Permission;
};
