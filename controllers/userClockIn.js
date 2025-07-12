const { connection, createConnection } = require("../database");
const jwt = require("jsonwebtoken");

const userClockIn = async (req, res) => {
  const { staffId, storeNumber } = req.body;

  if (!staffId) {
    return res.status(400).json({ msg: "Staff Id is required" });
  }
  if (!storeNumber) {
    return res.status(400).json({ msg: "Store is required" });
  }

  try {
    const connect = await createConnection();

    const [rows] = await connect.execute(
      "SELECT * FROM users WHERE staffId = ?",
      [staffId]
    );

    const staffData = rows?.[0];
    if (staffId !== staffData?.staffId) {
      return res
        .status(400)
        .send({ success: false, message: "User not found", staffData });
    }
    if (storeNumber !== parseInt(staffData?.storeNumber)) {
      return res.status(400).send({
        success: false,
        message: "User not assigned to this store",
      });
    }
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${staffId} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        storeId VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await connect.execute(createTableQuery);

    await connect.execute(`INSERT INTO ${staffId} (storeId) VALUES (?)`, [
      staffId,
    ]);
    const data = {
      id: staffData?.id,
      email: staffData?.email,
      firstName: staffData?.firstName,
      lastName: staffData?.lastName,
      storeNumber: staffData?.storeNumber,
      address: staffData?.address,
      role: "Staff",
    };
    const accessToken = jwt.sign(
      {
        user: data,
      },
      process.env.JWT_SECRET,
      { expiresIn: "300000s" }
    );

    await connect.end();
    return res.status(201).json({
      success: true,
      data: {
        ...data,
        access: accessToken,
        message: "Clocked in successfully",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getUserClockInDetails = async (req, res) => {
  const { staffId } = req.body;
  try {
    const [rows] = await connection.query(`SELECT * FROM ${staffId}`);
    const data = rows;
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Error retrieving users:", err);
    res.status(500).send("Error retrieving users");
  }
};

const updateUser = async (req, res) => {
  const userId = req.params.id;
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
    store,
  } = req.body;
  const query =
    "UPDATE users SET firstName = ?, lastName = ?, staffId = ?, email = ?, phoneNumber = ?, address = ?, payPerHour = ?, shift = ?, days = ?, store = ?  WHERE id = ?";
  try {
    const [result] = await connection.execute(query, [
      firstName,
      lastName,
      staffId,
      email,
      phoneNumber,
      address,
      payPerHour,
      shift,
      days,
      store,
      userId,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).send("User not found");
    }
    return res
      .status(200)
      .json({ success: true, message: "User updated successfully" });
  } catch (err) {
    console.error("Error updating data:", err);
    res.status(500).send("Error updating user");
  }
};

module.exports = {
  userClockIn,
  getUserClockInDetails,
  updateUser,
};
