const express = require("express");
const router = express.Router();
const { checkPermission } = require("../middleware/checkPermission");
const { models } = require("../models/index");

router.get("/", checkPermission("can_read_roles"), async (req, res) => {
  const roles = await models.Role.findAll();
  res.json(roles);
});

router.post("/", checkPermission("can_create_roles"), async (req, res) => {
  const { name } = req.body;
  const role = await models.Role.create({ name });
  res.status(201).json(role);
});

router.put("/:id", checkPermission("can_edit_roles"), async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const role = await models.Role.findByPk(id);
  if (!role) return res.status(404).json({ error: "Role not found" });

  await role.update({ name });
  res.json(role);
});

router.delete("/:id", checkPermission("can_delete_roles"), async (req, res) => {
  const { id } = req.params;
  const role = await models.Role.findByPk(id);
  if (!role) return res.status(404).json({ error: "Role not found" });

  await role.destroy();
  res.status(204).send();
});

module.exports = router;
