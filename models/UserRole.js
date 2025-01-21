// const { Sequelize } = require("sequelize");

// module.exports = (sequelize) => {
//   const UserRole = sequelize.define("UserRole", {
//     id: {
//       type: Sequelize.CHAR(36),
//       primaryKey: true,
//       defaultValue: Sequelize.UUIDV4,
//     },
//     userId: Sequelize.CHAR(36),
//     roleId: Sequelize.CHAR(36),
//     createdAt: {
//       type: Sequelize.DATE,
//       allowNull: false,
//     },
//     updatedAt: {
//       type: Sequelize.DATE,
//       allowNull: false,
//     },
//   });

//   return UserRole;
// };

const { Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const UserRole = sequelize.define("UserRole", {
    id: {
      type: Sequelize.CHAR(36),
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    userId: {
      type: Sequelize.CHAR(36),
      allowNull: false,
      references: {
        model: "Users", // Имя таблицы пользователей
        key: "id",
      },
      onDelete: "CASCADE", // Удаление связей при удалении пользователя
    },
    roleId: {
      type: Sequelize.CHAR(36),
      allowNull: false,
      references: {
        model: "Roles",
        key: "id",
      },
      onDelete: "CASCADE",
    },
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

  return UserRole;
};
