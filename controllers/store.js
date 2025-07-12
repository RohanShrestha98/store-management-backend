const { connection, createConnection } = require("../database");
const { requiredFieldHandler } = require("../helper/requiredFieldHandler");
const { statusHandeler } = require("../helper/statusHandler");
const crypto = require("crypto");


const createStore = async (req, res) => {
  const { name, address, storeNumber, open, close } = req.body;
  const requiredFields = { name, address, storeNumber, open, close };
const uid = crypto.randomBytes(16).toString("hex");


  if (requiredFieldHandler(res, requiredFields)) return;
  try {
    const connect = await createConnection();

    const [rows] = await connect.execute(
      "SELECT * FROM store WHERE storeNumber = ? AND createdBy = ?",
      [storeNumber, req?.user?.id]
    );
    const existCheck = [
      {
        label: "name",
        value: rows?.[0]?.name == name,
      },
      {
        label: "storeNumber",
        value: rows?.[0]?.storeNumber == storeNumber,
      },
    ];
    const existingField = existCheck.find((item) => item.value);

    if (existingField) {
      return statusHandeler(
        res,
        400,
        false,
        `${existingField.label} already exists`,
        existingField.label
      );
    }

    await connect.execute(
      "INSERT INTO store (id, name, address, storeNumber, open, close, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [uid, name, address, storeNumber, open, close, req?.user?.id]
    );

    await connect.end();

    return statusHandeler(res, 201, true, "Store created successfully");
  } catch (error) {
    console.error("Error:", error);
    return statusHandeler(res, 500, false, "Internal Server error");
  }
};

const getStore = async (req, res) => {
  const { page = 1, pageSize = 10, searchText = "" } = req.query;
  const offset = (page - 1) * pageSize;

  try {
    const [userRows] = await connection.query(
      "SELECT id, role, createdBy FROM users WHERE id = ?",
      [req?.user?.id]
    );
    let userId =
      req?.user?.role !== "Admin" ? userRows?.[0]?.createdBy : req?.user?.id;
    let whereClause = `WHERE createdBy = ?`;
    let params = [userId];

    if (searchText) {
      whereClause +=
        " AND (storeNumber LIKE ? OR name LIKE ? OR address LIKE ?)";
      const keyword = `%${searchText}%`;
      params.push(keyword, keyword, keyword);
    }

    const [countRows] = await connection.query(
      `SELECT COUNT(*) as total FROM store ${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    const [rows] = await connection.query(
      `SELECT * FROM store ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), offset]
    );

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages,
      },
    });
  } catch (err) {
    console.error("Error retrieving store:", err);
    statusHandeler(res, 500, false, "Error retrieving store");
  }
};

const getTotalStoreCount = async (req, res) => {
  const userId = req?.user?.id;

  try {
    const [stores] = await connection.query(
      "SELECT * FROM store WHERE createdBy = ? ORDER BY createdAt DESC",
      [userId]
    );

    const total = stores?.length;

    return res.status(200).json({
      success: true,
      total,
    });
  } catch (error) {
    console.error("Error retrieving user stores:", error);
    return res.status(500).json({
      success: false,
      msg: "Internal Server Error",
    });
  }
};

const deleteStore = async (req, res) => {
  const storeId = req.params.id;
  const query = "DELETE FROM store WHERE id = ?";

  try {
    const [result] = await connection.execute(query, [storeId]);

    if (result.affectedRows === 0) {
      return res.status(404).send({
        success: false,
        messege: `Store not found`,
      });
    }
    statusHandeler(
      res,
      200,
      true,
      `Store with ID ${storeId} deleted successfully`
    );
  } catch (err) {
    statusHandeler(res, 500, false, "Error deleting Store");
  }
};

const updateStore = async (req, res) => {
  const storeId = req.params.id;
  const { name, address, storeNumber, open, close } = req.body;
  const query =
    "UPDATE store SET name = ?, address = ?, storeNumber = ?, open = ?, close = ? WHERE id = ?";

  try {
    const [rows] = await connection.query("SELECT * FROM store WHERE id = ?", [
      storeId,
    ]);
    const storeData = rows?.[0];
    const [result] = await connection.execute(query, [
      name ?? storeData?.name,
      address ?? storeData?.address,
      storeNumber ?? storeData?.storeNumber,
      open ?? storeData?.open,
      close ?? storeData?.close,
      storeId,
    ]);

    if (result.affectedRows === 0) {
      return statusHandeler(res, 404, false, "Store not found");
    }

    statusHandeler(
      res,
      200,
      true,
      `${name ?? storeData?.name} store updated successfully`
    );
  } catch (err) {
    statusHandeler(res, 500, false, "Error updating store");
  }
};

module.exports = {
  createStore,
  getTotalStoreCount,
  getStore,
  updateStore,
  deleteStore,
};
