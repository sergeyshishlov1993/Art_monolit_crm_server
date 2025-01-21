const { can } = require("../utils/permissions");

/**
 * Middleware для перевірки доступу
 * @param {string} permissionKey - Ключ дозволу
 */
function checkPermission(permissionKey) {
  return async (req, res, next) => {
    const userId = req.user?.id; // Отримати ID користувача з токена або сесії
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const allowed = await can(userId, permissionKey);
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next(); // Продовжити, якщо доступ дозволено
  };
}

module.exports = { checkPermission };
