const express = require("express");
const router = express.Router();
const { checkPermission } = require("../middleware/checkPermission");
const { models } = require("../models/index");

router.get("/", checkPermission("can_read_permissions"), async (req, res) => {
  const permissions = await models.Permission.findAll();
  res.json(permissions);
});

router.post(
  "/",
  checkPermission("can_create_permissions"),
  async (req, res) => {
    const { name, key } = req.body;
    const permission = await models.Permission.create({ name, key });
    res.status(201).json(permission);
  }
);

router.put(
  "/:id",
  checkPermission("can_edit_permissions"),
  async (req, res) => {
    const { id } = req.params;
    const { name, key } = req.body;
    const permission = await models.Permission.findByPk(id);
    if (!permission)
      return res.status(404).json({ error: "Permission not found" });

    await permission.update({ name, key });
    res.json(permission);
  }
);

router.delete(
  "/:id",
  checkPermission("can_delete_permissions"),
  async (req, res) => {
    const { id } = req.params;
    const permission = await models.Permission.findByPk(id);
    if (!permission)
      return res.status(404).json({ error: "Permission not found" });

    await permission.destroy();
    res.status(204).send();
  }
);

module.exports = router;
