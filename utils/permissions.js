const { models } = require("../models"); // Імпорт моделей

/**
 * Перевіряє, чи має користувач певний дозвіл.
 * @param {string} userId - ID користувача
 * @param {string} permissionKey - Ключ дозволу
 * @returns {Promise<boolean>} - true, якщо дозволено; false, якщо ні
 */
async function can(userId, permissionKey) {
  try {
    // Завантажити користувача з ролями та дозволами
    const user = await models.User.findByPk(userId, {
      include: {
        model: models.Role,
        include: {
          model: models.Permission,
          where: { key: permissionKey },
        },
      },
    });

    // Якщо знайдено користувача і дозволи, повернути true
    return !!user && user.Roles.some((role) => role.Permissions.length > 0);
  } catch (error) {
    console.error("Error in can:", error);
    return false;
  }
}

module.exports = { can };
