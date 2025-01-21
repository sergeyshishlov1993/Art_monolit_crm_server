// const { Sequelize } = require("sequelize");

// module.exports = (sequelize) => {
//   const RolePermission = sequelize.define("RolePermission", {
//     id: {
//       type: Sequelize.CHAR(36),
//       primaryKey: true,
//       defaultValue: Sequelize.UUIDV4,
//     },
//     roleId: Sequelize.CHAR(36),
//     permissionId: Sequelize.CHAR(36),
//     createdAt: {
//       type: Sequelize.DATE,
//       allowNull: false,
//     },
//     updatedAt: {
//       type: Sequelize.DATE,
//       allowNull: false,
//     },
//   });

//   return RolePermission;
// };

const { Sequelize } = require("sequelize");

module.exports = (sequelize) => {
  const RolePermission = sequelize.define(
    "RolePermission",
    {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      roleId: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: "Roles", // Имя таблицы ролей
          key: "id",
        },
        onDelete: "CASCADE", // Удаление связей при удалении роли
      },
      permissionId: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: "Permissions", // Имя таблицы разрешений
          key: "id",
        },
        onDelete: "CASCADE", // Удаление связей при удалении разрешения
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
    },
    { timestamps: true }
  );

  return RolePermission;
};
