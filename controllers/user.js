const bcrypt = require("bcrypt");
const { connection, createConnection } = require("../database");
const jwt = require("jsonwebtoken");
const { nullCheckHandler } = require("../helper/nullCheckHandler");
const { requiredFieldHandler } = require("../helper/requiredFieldHandler");
const { paginateQuery } = require("../helper/paginationHelper");

const crypto = require("crypto");

const signUp = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    phoneNumber,
    address,
    storeId,
    createdBy,
  } = req.body;
  const requiredFields = {
    firstName,
    lastName,
    phoneNumber,
    address,
    email,
    password,
    storeId,
    createdBy,
  };

  if (requiredFieldHandler(res, requiredFields)) return;

  const uid = crypto.randomBytes(16).toString("hex");

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const connect = await createConnection();
    const [userRows] = await connection.query(
      "SELECT id, createdBy FROM users WHERE id = ?",
      [createdBy]
    );
    let createdUnder = userRows?.[0]?.createdBy;

    const [rows] = await connect.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    const [rowsPhone] = await connect.execute(
      "SELECT * FROM users WHERE phoneNumber = ?",
      [phoneNumber]
    );
    if (rows.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }
    if (rowsPhone.length > 0) {
      return res.status(400).json({ message: "Phone number already exists" });
    }

    await connect.execute(
      "INSERT INTO users (id, firstName, lastName, email, password, phoneNumber, address, storeId, createdUnder, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        uid,
        firstName,
        lastName,
        email,
        hashedPassword,
        phoneNumber,
        address,
        storeId,
        createdUnder,
        createdBy,
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

const createUser = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    phoneNumber,
    address,
    staffId,
    storeId,
    payPerHour,
    role,
    isVerified,
  } = req.body;

  const requiredFields = {
    firstName,
    lastName,
    phoneNumber,
    storeId,
    address,
    email,
    password,
  };

  if (requiredFieldHandler(res, requiredFields)) return;
  const uid = crypto.randomBytes(16).toString("hex");

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const connect = await createConnection();

    const [userRows] = await connection.query(
      "SELECT id, createdBy FROM users WHERE id = ?",
      [req?.user?.id]
    );
    let createdUnder =
      req?.user?.role !== "Admin" ? userRows?.[0]?.createdBy : req?.user?.id;

    const [rows] = await connect.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    const [rowsPhone] = await connect.execute(
      "SELECT * FROM users WHERE phoneNumber = ?",
      [phoneNumber]
    );
    if (rows.length > 0) {
      return res.status(400).json({ email: "Email already exists" });
    }
    if (rowsPhone.length > 0) {
      return res
        .status(400)
        .json({ phoneNumber: "Phone number already exists" });
    }

    await connect.execute(
      "INSERT INTO users (id, firstName, lastName, email, password, phoneNumber, address, staffId, payPerHour, isVerified, storeId, role, createdUnder, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ? , ?, ?, ?, ?, ?)",
      [
        uid,
        firstName,
        lastName,
        email,
        hashedPassword,
        phoneNumber,
        address,
        staffId,
        payPerHour,
        isVerified,
        storeId,
        role,
        createdUnder,
        req?.user?.id,
      ]
    );

    await connect.end();

    return res
      .status(201)
      .json({ success: true, message: "Staff added successfull" });
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
    "SELECT * FROM users WHERE email = ?",
    [email]
  );
  const [rowsAdmin] = await connection.execute(
    "SELECT * FROM admins WHERE email = ?",
    [email]
  );

  if (!rows?.length && !rowsAdmin?.length) {
    return res.status(400).json({ error: "User not found" });
  }

  if (!rowsAdmin && !rows?.[0]?.isVerified) {
    return res.status(400).json({ error: "User is not verified" });
  }

  const userData = rows?.[0] ?? rowsAdmin?.[0];

  try {
    const comparePassword = await bcrypt.compareSync(
      password,
      userData?.password
    );
    if (comparePassword) {
      const data = {
        id: userData?.id,
        email: userData?.email,
        firstName: userData?.firstName,
        name: userData?.name,
        storeLimit: userData?.storeLimit,
        lastName: userData?.lastName,
        storeId: userData?.storeId,
        address: userData?.address,
        role: userData?.role,
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

const getUsers = async (req, res) => {
  const { page = 1, pageSize = 10, searchText = "", storeId } = req.query;

  try {
    const [userRows] = await connection.query(
      "SELECT id, createdBy FROM users WHERE id = ?",
      [req?.user?.id]
    );

    const createdUnder =
      req?.user?.role !== "Admin" ? userRows?.[0]?.createdBy : req?.user?.id;

    const filters = [];
    const params = [];

    if (storeId ?? req?.user?.storeId) {
      filters.push("storeId = ?");
      params.push(storeId ?? req?.user?.storeId);
    }

    filters.push("createdUnder = ?");
    params.push(createdUnder);

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const baseQuery = `
      SELECT id, firstName, lastName, staffId, role, email, isVerified, phoneNumber, address, storeId, payPerHour, days, shift 
      FROM users 
      ${whereClause}
    `;

    const countQuery = `
      SELECT COUNT(*) as total 
      FROM users 
      ${whereClause}
    `;
    const { rows, pagenation } = await paginateQuery({
      connection,
      baseQuery,
      countQuery,
      searchText,
      page,
      pageSize,
      searchField: "firstName",
      queryParams: params,
    });
    const filterCurrentUser = rows?.filter(
      (item) => item?.id !== req?.user?.id
    );

    return res.status(200).json({
      success: true,
      data: filterCurrentUser,
      pagenation,
    });
  } catch (err) {
    console.error("Error retrieving users:", err);
    return res.status(500).json({
      success: false,
      message: "Error retrieving users",
    });
  }
};

const getUserDetails = async (req, res) => {
  const { email } = req.query;

  try {
    const [rows] = await connection.query(
      "SELECT id, firstName, lastName, staffId, role, email, isVerified, phoneNumber, address, storeId, payPerHour, days, shift FROM users WHERE email = ?",
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

const deleteUser = async (req, res) => {
  const userId = req.params.id;
  const query = "DELETE FROM users WHERE id = ?";

  try {
    const [result] = await connection.execute(query, [userId]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .send({ success: false, message: "User not found" });
    }
    return res.status(200).send({
      success: true,
      messege: `User with ID ${userId} deleted successfully`,
    });
  } catch (err) {
    console.error("Error deleting data:", err);
    return res.status(500).send({
      success: true,
      messege: `Error deleting user`,
    });
  }
};

const updateUser = async (req, res) => {
  const id = req.params.id;
  const {
    firstName,
    lastName,
    staffId,
    email,
    phoneNumber,
    address,
    payPerHour,
    shift,
    days,
    storeId,
    role,
    isVerified,
  } = req.body;
  const query =
    "UPDATE users SET firstName = ?, lastName = ?,   address = ?, isVerified = ?, payPerHour = ?, shift = ?, days = ?, storeId = ?, role = ?  WHERE id = ?";
  try {
    const [rows] = await connection.execute(
      "SELECT email, phoneNumber, staffId FROM users WHERE id = ?",
      [id]
    );
    const userData = rows?.[0];
    const [result] = await connection.execute(query, [
      firstName,
      lastName,
      address,
      true,
      payPerHour,
      shift,
      days,
      storeId,
      role ?? "Staff",
      id,
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
  signUp,
  login,
  getUserDetails,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
};
