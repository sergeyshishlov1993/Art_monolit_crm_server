const { Sequelize, DataTypes } = require("sequelize");
const sequelize = new Sequelize("ART-Monolit-CRM", "root", "Shishlov1993", {
  host: "127.0.0.1",
  dialect: "mysql",
  logging: false,
});

const models = {};

models.Warehouse = require("./Warehouse")(sequelize, DataTypes);
models.Arrival = require("./Arrival")(sequelize, DataTypes);
models.Defective = require("./Defective")(sequelize, DataTypes);
models.Materials = require("./Materials")(sequelize, DataTypes);
models.Orders = require("./Orders")(sequelize, DataTypes);
models.OrderMaterials = require("./OrderMaterials")(sequelize, DataTypes);
models.OrderWorks = require("./OrderWorks")(sequelize, DataTypes);
models.OrderServices = require("./OrderServices")(sequelize, DataTypes);
models.OrderDeads = require("./OrderDeads")(sequelize, DataTypes);
models.OrderStatuses = require("./OrderStatuses")(sequelize, DataTypes);
models.OrderPhotoLinks = require("./OrderPhotoLinks")(sequelize, DataTypes);
models.PreOrders = require("./PreOrders")(sequelize, DataTypes);
models.PreOrderMaterials = require("./PreOrderMaterials")(sequelize, DataTypes);
models.PreOrderServices = require("./PreOrderServices")(sequelize, DataTypes);
models.PreOrderWorks = require("./PreOrderWorks")(sequelize, DataTypes);
models.User = require("./User")(sequelize, DataTypes);
models.RefreshToken = require("./RefreshToken")(sequelize, DataTypes);
models.Permission = require("./Permission")(sequelize, DataTypes);
models.Role = require("./Role")(sequelize, DataTypes);
models.UserRole = require("./UserRole")(sequelize, DataTypes);
models.RolePermission = require("./RolePermission")(sequelize, DataTypes);
models.Stores = require("./Stores")(sequelize, DataTypes);

models.User.belongsToMany(models.Role, {
  through: models.UserRole,
  foreignKey: "userId",
  otherKey: "roleId",
});

models.Role.belongsToMany(models.User, {
  through: models.UserRole,
  foreignKey: "roleId",
  otherKey: "userId",
});

models.Role.belongsToMany(models.Permission, {
  through: models.RolePermission,
  foreignKey: "roleId",
  otherKey: "permissionId",
});

models.Permission.belongsToMany(models.Role, {
  through: models.RolePermission,
  foreignKey: "permissionId",
  otherKey: "roleId",
});

Object.values(models).forEach((model) => {
  if (model.associate) {
    model.associate(models);
  }
});

sequelize
  .sync({ alter: true })
  .then(() => console.log("Database synced successfully"))
  .catch((err) => console.error("Database sync failed:", err));

module.exports = { sequelize, models };
