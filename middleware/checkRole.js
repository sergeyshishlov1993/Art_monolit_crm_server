function checkRole(requiredRole) {
  return (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);

      if (decoded.roles.includes(requiredRole)) {
        req.user = decoded;
        return next();
      }

      return res
        .status(403)
        .json({ error: `Forbidden: ${requiredRole} role required` });
    } catch (error) {
      console.error("Error in role verification:", error);
      return res.status(403).json({ error: "Forbidden" });
    }
  };
}

module.exports = { checkRole };
