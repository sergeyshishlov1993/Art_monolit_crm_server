const { Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const Role = sequelize.define("Role", {
    id: {
      type: Sequelize.CHAR(36),
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    name: Sequelize.STRING,
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
  });

  return Role;
};
