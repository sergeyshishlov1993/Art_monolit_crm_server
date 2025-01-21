function isOwner(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    if (decoded.roles.includes("Owner")) {
      req.user = decoded; // Сохраняем пользователя в запросе
      return next();
    }

    return res.status(403).json({ error: "Forbidden: Owner access required" });
  } catch (error) {
    console.error("Error in role verification:", error);
    return res.status(403).json({ error: "Forbidden" });
  }
}

module.exports = { isOwner };
