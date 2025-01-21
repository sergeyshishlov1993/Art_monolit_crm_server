const express = require("express");
const router = express.Router();
const { models } = require("../models/index");
const { User } = models;

router.get("/", async (req, res) => {
  try {
    const users = await User.findAll(); // Отримуємо всіх користувачів
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params; // ID користувача з параметрів URL
  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
