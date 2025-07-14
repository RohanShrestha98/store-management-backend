require("dotenv").config();
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const cors = require("cors");

app.use(bodyParser.json());
app.use("/uploads", express.static("uploads"));
app.use(cors());

// Routes
const adminRoute = require("./routes/admin");
const userRoute = require("./routes/user");
const storeRoute = require("./routes/store");
const categoryRoute = require("./routes/category");
const productRoute = require("./routes/product");
const salesRoute = require("./routes/sales");
const vendorRoute = require("./routes/vendor");
const fileUploadRoute = require("./routes/fileUpload");
const userClockInRoute = require("./routes/userClockIn");

const connection = mysql.createConnection({
  host: process.env.DB_URL,
  user: "root",
  password: "zaq@XSW2345",
  database: "store",
});

// Connect to the MySQL database
connection.connect((err) => {
  if (err) {
    console.error("Error connecting to the MySQL database:", err);
    return;
  }
  console.log("Connected to the MySQL database!");
});

app.get("/", function (req, res) {
  res.status(200).json({
    msg: "Welcome to nodejs",
  });
});

app.use("", fileUploadRoute);
app.use("/api/clock-in", userClockInRoute);
app.use("/api/user", userRoute);
app.use("/api/admin", adminRoute);
app.use("/api/store", storeRoute);
app.use("/api/category", categoryRoute);
app.use("/api/product", productRoute);
app.use("/api/sales", salesRoute);
app.use("/api/vendor", vendorRoute);

const PORT = process.env.PORT || 3307;

app.listen(PORT, () => {
  console.log(`Server is up and running on port ${PORT}`);
});
