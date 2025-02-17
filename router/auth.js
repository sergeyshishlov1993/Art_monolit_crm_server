const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();
const { models } = require("../models/index");
const { User, RefreshToken, Role, Permission } = models;

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY;
const REFRESH_SECRET_KEY = `${SECRET_KEY}_refresh`;

const blacklistedTokens = new Set();

router.post("/login", async (req, res) => {
  const { name, password } = req.body;

  try {
    const user = await User.findOne({
      where: { name },
      include: {
        model: Role,
        include: {
          model: Permission,
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const permissions = user.Roles.flatMap((role) =>
      role.Permissions.map((permission) => permission.key)
    );

    const accessToken = jwt.sign({ id: user.id, permissions }, SECRET_KEY, {
      expiresIn: "1h",
    });

    const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET_KEY, {
      expiresIn: "7d",
    });

    await RefreshToken.create({ token: refreshToken, userId: user.id });

    res.json({ accessToken, refreshToken, permissions, user });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/logout", async (req, res) => {
  const { token, refreshToken } = req.body;

  try {
    if (token) blacklistedTokens.add(token);

    if (refreshToken) {
      await RefreshToken.destroy({ where: { token: refreshToken } });
    }

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh Token is required" });
  }

  try {
    const tokenEntry = await RefreshToken.findOne({
      where: { token: refreshToken },
    });
    if (!tokenEntry) {
      return res.status(403).json({ error: "Invalid Refresh Token" });
    }

    const decoded = jwt.verify(refreshToken, REFRESH_SECRET_KEY);

    const accessToken = jwt.sign({ id: decoded.id }, SECRET_KEY, {
      expiresIn: "15m",
    });

    res.json({ accessToken });
  } catch (error) {
    console.error("Error during token refresh:", error);
    res.status(403).json({ error: "Invalid or expired Refresh Token" });
  }
});

router.get("/me", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (blacklistedTokens.has(token)) {
    return res.status(403).json({ error: "Token is blacklisted" });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error in token verification:", error);
    res.status(403).json({ error: "Forbidden" });
  }
});

module.exports = router;
