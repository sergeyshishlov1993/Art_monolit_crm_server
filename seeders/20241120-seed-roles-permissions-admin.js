"use strict";
const { v4: uuidv4 } = require("uuid"); // Імпорт бібліотеки для генерації UUID
const bcrypt = require("bcrypt");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const adminRoleId = uuidv4();

    // Додавання ролі Admin
    await queryInterface.bulkInsert("Roles", [
      {
        id: adminRoleId,
        name: "Владелец",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const warehousePermissionId = uuidv4();
    const arrivalPermissionId = uuidv4();
    const ordersPermissionId = uuidv4();
    const canWriteOrderId = uuidv4();
    const calculationPermissionId = uuidv4();
    const defectivePermissionId = uuidv4();
    const materialsPermissionId = uuidv4();

    await queryInterface.bulkInsert("Permissions", [
      {
        id: warehousePermissionId,
        name: "warehouse",
        key: "warehouse",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: arrivalPermissionId,
        name: "arrival",
        key: "arrival",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: ordersPermissionId,
        name: "orders",
        key: "orders",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: canWriteOrderId,
        name: "can write orders",
        key: "can_write_orders",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: calculationPermissionId,
        name: "calculation",
        key: "calculation",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: defectivePermissionId,
        name: "defective",
        key: "defective",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: materialsPermissionId,
        name: "materials",
        key: "materials",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await queryInterface.bulkInsert("RolePermissions", [
      {
        id: uuidv4(),
        roleId: adminRoleId,
        permissionId: warehousePermissionId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        roleId: adminRoleId,
        permissionId: arrivalPermissionId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        roleId: adminRoleId,
        permissionId: ordersPermissionId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        roleId: adminRoleId,
        permissionId: canWriteOrderId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        roleId: adminRoleId,
        permissionId: calculationPermissionId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        roleId: adminRoleId,
        permissionId: defectivePermissionId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuidv4(),
        roleId: adminRoleId,
        permissionId: materialsPermissionId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Генерація UUID для адміністратора
    const adminUserId = uuidv4();

    // Додавання адміністратора
    await queryInterface.bulkInsert("Users", [
      {
        id: adminUserId,
        name: "Владелец",
        password: await bcrypt.hash("123456", 10),
        address: "Космическая 63",
        isOwner: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Прив'язка ролі Admin до адміністратора
    await queryInterface.bulkInsert("UserRoles", [
      {
        id: uuidv4(),
        userId: adminUserId,
        roleId: adminRoleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("UserRoles", null, {});
    await queryInterface.bulkDelete("Users", null, {});
    await queryInterface.bulkDelete("RolePermissions", null, {});
    await queryInterface.bulkDelete("Permissions", null, {});
    await queryInterface.bulkDelete("Roles", null, {});
  },
};
