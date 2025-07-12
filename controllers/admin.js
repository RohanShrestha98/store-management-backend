const bcrypt = require("bcrypt");
const { connection, createConnection } = require("../database");
const jwt = require("jsonwebtoken");
const { nullCheckHandler } = require("../helper/nullCheckHandler");
const { requiredFieldHandler } = require("../helper/requiredFieldHandler");
const { paginateQuery } = require("../helper/paginationHelper");
const crypto = require("crypto");

const createAdmin = async (req, res) => {
  const { name, email, password, phoneNumber, address, storeLimit } = req.body;
  const requiredFields = {
    name,
    storeLimit,
    phoneNumber,
    address,
    email,
    password,
  };

  if (requiredFieldHandler(res, requiredFields)) return;
  const uid = crypto.randomBytes(16).toString("hex");

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const connect = await createConnection();

    const [rows] = await connect.execute(
      "SELECT * FROM admins WHERE email = ?",
      [email]
    );
    const [rowsPhone] = await connect.execute(
      "SELECT * FROM admins WHERE phoneNumber = ?",
      [phoneNumber]
    );
    if (rows.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }
    if (rowsPhone.length > 0) {
      return res.status(400).json({ message: "Phone number already exists" });
    }
    const [rowsUserEmail] = await connect.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    if (rowsUserEmail.length > 0) {
      return res
        .status(400)
        .json({ message: "Email already exists in user portal" });
    }

    await connect.execute(
      "INSERT INTO admins (id, name, storeLimit, email, password, phoneNumber, address, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        uid,
        name,
        storeLimit,
        email,
        hashedPassword,
        phoneNumber,
        address,
        "Admin",
      ]
    );

    await connect.end();

    return res
      .status(201)
      .json({ success: true, message: "Register successfull" });
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const requiredFields = { email, password };
  if (requiredFieldHandler(res, requiredFields)) return;

  const [rows] = await connection.execute(
    "SELECT * FROM admins WHERE email = ?",
    [email]
  );
  const userData = rows?.[0];

  try {
    nullCheckHandler(res, "users", "email", email);

    const comparePassword = await bcrypt.compareSync(
      password,
      userData?.password
    );
    if (comparePassword) {
      const data = {
        id: userData?.id,
        email: userData?.email,
        name: userData?.name,
        storeLimit: userData?.storeLimit,
        address: userData?.address,
        role: "Admin",
      };
      const accessToken = jwt.sign(
        {
          user: data,
        },
        process.env.JWT_SECRET,
        { expiresIn: "300000s" }
      );
      return res.status(200).json({
        success: true,
        data: { ...data, access: accessToken },
      });
    } else {
      return res
        .status(500)
        .send({ success: false, message: "Incorrect password" });
    }
  } catch (err) {
    console.error("Failed to login", err);
    return res.status(500).send({
      success: true,
      messege: "Failed to login",
    });
  }
};

const getAdmin = async (req, res) => {
  try {
    const [rows] = await connection.execute("SELECT * FROM admins");
    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("Error retrieving users:", err);
    return res.status(500).json({
      success: false,
      message: "Error retrieving users",
    });
  }
};

const getAdminDetails = async (req, res) => {
  const { email } = req.query;

  try {
    const [rows] = await connection.query(
      "SELECT id, name, email, phoneNumber, address, storeLimit, role FROM admins WHERE email = ?",
      [email]
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("Error retrieving users:", err);
    return res.status(500).json({
      success: false,
      message: "Error retrieving users",
    });
  }
};

const deleteAdmin = async (req, res) => {
  const userId = req.params.id;
  const query = "DELETE FROM admins WHERE id = ?";

  try {
    const [result] = await connection.execute(query, [userId]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .send({ success: false, message: "User not found" });
    }
    return res.status(200).send({
      success: true,
      messege: `User deleted successfully`,
    });
  } catch (err) {
    console.error("Error deleting data:", err);
    return res.status(500).send({
      success: true,
      messege: `Error deleting user`,
    });
  }
};

const updateAdmin = async (req, res) => {
  const id = req.params.id;
  const { name, email, phoneNumber, address, storeLimit } = req.body;
  const query =
    "UPDATE admins SET name = ?, email = ?, phoneNumber = ?, address = ?, storeLimit = ?  WHERE id = ?";
  try {
    const [rows] = await connection.execute(
      "SELECT email, phoneNumber FROM admins WHERE id = ?",
      [id]
    );
    const userData = rows?.[0];
    const [result] = await connection.execute(query, [
      name ?? userData?.name,
      email ?? userData?.email,
      phoneNumber ?? userData?.phoneNumber,
      address ?? userData?.address,
      storeLimit ?? userData?.storeLimit,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).send("User not found");
    }
    return res
      .status(200)
      .json({ success: true, message: "User updated successfully" });
  } catch (err) {
    console.error("Error updating data:", err);
    return res.status(500).send("Error updating user");
  }
};

module.exports = {
  createAdmin,
  login,
  getAdminDetails,
  getAdmin,
  updateAdmin,
  deleteAdmin,
};
