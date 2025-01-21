const express = require("express");
const app = express();
const cors = require("cors");

require("dotenv").config();

const arrival = require("./router/arrival");
const defective = require("./router/defective");
const materials = require("./router/materials");
const orders = require("./router/orders");
const ownerRoutes = require("./router/owner");
const permissionRoutes = require("./router/permissions");
const preOrders = require("./router/preOrdersCalc");
const authRoutes = require("./router/auth");
const roleRoutes = require("./router/roles");
const userRoutes = require("./router/users");
const warehouse = require("./router/warehouse");

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/arrival", arrival);
app.use("/defective", defective);
app.use("/materials", materials);
app.use("/orders", orders);
app.use("/owner", ownerRoutes);
app.use("/pre-orders", preOrders);
app.use("/user", userRoutes);
app.use("/roles", roleRoutes);
app.use("/permissions", permissionRoutes);
app.use("/warehouse", warehouse);

app.get("/", (req, res) => {
  res.send("Привет, мир!");
});

const appPort = process.env.APP_PORT || 8000;
app.listen(appPort, () => {
  console.log(`Приложение запущено на http://localhost:${appPort}`);
});
