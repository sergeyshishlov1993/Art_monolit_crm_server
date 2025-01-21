const express = require("express");
const bcrypt = require("bcrypt");
const { models } = require("../models/index");
const { User, Role, Permission } = models;

const router = express.Router();

router.get("/users", async (req, res) => {
  try {
    const users = await User.findAll({
      include: {
        model: Role,
        include: {
          model: Permission,
        },
      },
    });

    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      password: user.password,
      address: user.address,
      createdAt: user.createdAt,
      roles: user.Roles.map((role) => ({
        id: role.id,
        name: role.name,
        permissions: role.Permissions.map((perm) => ({
          id: perm.id,
          name: perm.name,
          key: perm.key,
        })),
      })),
    }));

    res.status(200).json(formattedUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
router.post("/create-user", async (req, res) => {
  const { name, password, roleId, address } = req.body;

  const transaction = await User.sequelize.transaction();

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create(
      {
        name,
        password: hashedPassword,
        address: address,
      },
      { transaction }
    );

    if (roleId) {
      const role = await Role.findByPk(roleId, { transaction });

      if (!role) {
        await transaction.rollback();

        return res.status(404).json({ error: "Role not found" });
      }
      await user.addRole(role, { transaction });
    }

    await transaction.commit();

    console.log("Fetching user from DB for verification...");
    const userFromDB = await User.findOne({ where: { id: user.id } });
    console.log("Password in DB after creation:", userFromDB.password);

    res.status(201).json({ message: "User created successfully", user });
  } catch (error) {
    console.error("Error creating user:", error);

    await transaction.rollback();
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/update-user/:id", async (req, res) => {
  const { id } = req.params;
  const { name, password, roleId, address } = req.body;

  const transaction = await User.sequelize.transaction();

  try {
    const user = await User.findByPk(id, { transaction });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: "User not found" });
    }

    if (name) user.name = name;
    if (address) user.address = address;

    if (password) {
      if (!password.startsWith("$2b$") && !password.startsWith("$2a$")) {
        user.password = await bcrypt.hash(password, 10);
      }
    }

    await user.save({ transaction });

    if (roleId) {
      const role = await Role.findByPk(roleId, { transaction });

      if (!role) {
        await transaction.rollback();
        return res.status(404).json({ error: "Role not found" });
      }

      await user.setRoles([role], { transaction });
    }

    await transaction.commit();

    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Error updating user:", error);

    await transaction.rollback();
    res.status(500).json({ error: "Internal Server Error" });
  }
});
router.delete("/delete-user/:id", async (req, res) => {
  const { id } = req.params;

  const transaction = await User.sequelize.transaction();

  try {
    const role = await User.findByPk(id, { transaction });

    if (!role) {
      await transaction.rollback();
      return res.status(404).json({ error: "Role not found" });
    }

    await role.destroy({ transaction });

    await transaction.commit();

    res.status(200).json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Error deleting role:", error);

    // Відкат транзакції у разі помилки
    await transaction.rollback();
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/roles", async (req, res) => {
  try {
    const roles = await Role.findAll({
      include: {
        model: Permission,
      },
    });

    const formattedRoles = roles.map((role) => ({
      id: role.id,
      name: role.name,
      createdAt: role.createdAt,
      permissions: role.Permissions.map((perm) => ({
        id: perm.id,
        name: perm.name,
        key: perm.key,
      })),
    }));

    res.status(200).json(formattedRoles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
router.post("/create-role-with-permissions", async (req, res) => {
  const { name, permissionIds } = req.body;

  const transaction = await Role.sequelize.transaction();

  try {
    const role = await Role.create({ name }, { transaction });

    if (permissionIds && permissionIds.length > 0) {
      const permissions = await Permission.findAll({
        where: { key: permissionIds },
        transaction,
      });

      if (permissions.length !== permissionIds.length) {
        await transaction.rollback();
        return res.status(404).json({
          error: "Some permissions not found in the database",
        });
      }

      await role.addPermissions(permissions, { transaction });
    }

    await transaction.commit();

    res.status(201).json({
      message: "Role created successfully with permissions",
      role,
    });
  } catch (error) {
    console.error("Error creating role with permissions:", error);

    await transaction.rollback();
    res.status(500).json({ error: "Internal Server Error" });
  }
});
router.put("/update-role-permissions", async (req, res) => {
  const { roleId, permissionIds } = req.body;

  const transaction = await Role.sequelize.transaction();

  try {
    const role = await Role.findByPk(roleId, { transaction });

    if (!role) {
      await transaction.rollback();
      return res.status(404).json({ error: "Role not found" });
    }

    const permissions = await Permission.findAll({
      where: { key: permissionIds }, // Находим разрешения по ключам
      transaction,
    });

    if (permissions.length !== permissionIds.length) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ error: "Some permissions not found in the database" });
    }

    await role.setPermissions(permissions, { transaction });

    await transaction.commit();

    res.status(200).json({
      message: "Permissions updated successfully",
      role,
    });
  } catch (error) {
    console.error("Error updating role permissions:", error);
    await transaction.rollback();
    res.status(500).json({ error: "Internal Server Error" });
  }
});
router.delete("/delete-role/:id", async (req, res) => {
  const { id } = req.params;

  const transaction = await Role.sequelize.transaction();

  try {
    const role = await Role.findByPk(id, { transaction });

    if (!role) {
      await transaction.rollback();
      return res.status(404).json({ error: "Role not found" });
    }

    await role.destroy({ transaction });

    await transaction.commit();

    res.status(200).json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Error deleting role:", error);

    // Відкат транзакції у разі помилки
    await transaction.rollback();
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
