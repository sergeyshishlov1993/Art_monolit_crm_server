const express = require("express");
const app = express();
const cors = require("cors");

require("dotenv").config();


const s3 = require("./s3Config");

const arrival = require("./router/arrival");
const defective = require("./router/defective");
const materials = require("./router/materials");
const orders = require("./router/orderRoutes");

const ownerRoutes = require("./router/owner");
const permissionRoutes = require("./router/permissions");
const preOrders = require("./router/preOrdersCalc");
const authRoutes = require("./router/auth");
const roleRoutes = require("./router/roles");
const userRoutes = require("./router/users");
const warehouse = require("./router/warehouse");

const bodyParser = require("body-parser");

app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));
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

app.post("/api/s3-presigned-url", async (req, res) => {
  try {
    const { fileName } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: "fileName обязателен" });
    }

    const fileKey = `uploads/${fileName}`;

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
      Expires: 300,
    };

    const presignedUrl = await s3.getSignedUrlPromise("putObject", params);

    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.eu-north-1.amazonaws.com/${fileKey}`;

    res.json({ presignedUrl, fileUrl, fileKey });
  } catch (error) {
    console.error("Ошибка генерации pre-signed URL:", error);
    res.status(500).json({ error: "Не удалось сгенерировать pre-signed URL" });
  }
});

const appPort = process.env.APP_PORT || 8000;
app.listen(appPort, () => {
  console.log(`Приложение запущено на http://localhost:${appPort}`);
});
