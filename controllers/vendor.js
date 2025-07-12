const { connection, createConnection } = require("../database");
const { requiredFieldHandler } = require("../helper/requiredFieldHandler");
const { statusHandeler } = require("../helper/statusHandler");

const createVendor = async (req, res) => {
  const { name, address, storeName, products } = req.body;
  const requiredFields = { name, address, storeName };

  if (requiredFieldHandler(res, requiredFields)) return;

  try {
    const connect = await createConnection();
    const [userRows] = await connection.query(
      "SELECT id, createdBy FROM users WHERE id = ?",
      [req?.user?.id]
    );
    let createdBy =
      req?.user?.role !== "Admin" ? userRows?.[0]?.createdBy : req?.user?.id;

    const [rows] = await connect.execute(
      "SELECT * FROM vendor WHERE name = ? AND createdBy = ?",
      [name, createdBy]
    );
    const [addressRows] = await connect.execute(
      "SELECT * FROM vendor WHERE address = ? AND createdBy = ?",
      [address, createdBy]
    );
    const [storeNameRows] = await connect.execute(
      "SELECT * FROM vendor WHERE storeName = ? AND createdBy = ?",
      [storeName, createdBy]
    );
    if (rows?.length > 0) {
      return statusHandeler(
        res,
        400,
        false,
        "Already exists try different name",
        "name"
      );
    }
    if (storeNameRows?.length > 0)
      return statusHandeler(
        res,
        400,
        false,
        "Already exists try different store name",
        "storeName"
      );

    await connect.execute(
      "INSERT INTO vendor (name, address, storeName, products, createdBy) VALUES (?, ?, ?, ?, ?)",
      [name, address, storeName, products, req.user.id]
    );

    await connect.end();

    return statusHandeler(res, 201, true, "Vendor created successfully");
  } catch (error) {
    console.error("Error:", error);
    return statusHandeler(
      res,
      500,
      false,
      "Internal Server error",
      addressRows
    );
  }
};

const getVendor = async (req, res) => {
  const { page = 1, pageSize = 10, searchText = "" } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  const keyword = `%${searchText}%`;

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
      whereClause += " AND (name LIKE ? OR address LIKE ? OR storeName LIKE ?)";
      params.push(keyword, keyword, keyword);
    }

    const [countRows] = await connection.query(
      `SELECT COUNT(*) as total FROM vendor ${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    const [rows] = await connection.query(
      `SELECT * FROM vendor ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
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
    console.error("Error retrieving vendor:", err);
    statusHandeler(res, 500, false, "Error retrieving vendor");
  }
};

const deleteVendor = async (req, res) => {
  const id = req.params.id;
  const query = "DELETE FROM vendor WHERE id = ?";

  try {
    const [result] = await connection.execute(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).send({
        success: false,
        messege: `Vendor not found`,
      });
    }
    statusHandeler(res, 200, true, `Vendor deleted successfully`);
  } catch (err) {
    statusHandeler(res, 500, false, "Error deleting vendor");
  }
};

const updateVendor = async (req, res) => {
  const id = req.params.id;
  const { name, address, products, storeName } = req.body;
  const query =
    "UPDATE vendor SET name = ?, address = ?, products = ?, storeName = ?, createdBy = ? WHERE id = ?";

  try {
    const [rows] = await connection.query("SELECT * FROM vendor WHERE id = ?", [
      id,
    ]);
    const data = rows?.[0];
    const [result] = await connection.execute(query, [
      name ?? data?.name,
      address ?? data?.address,
      products ?? data?.products,
      storeName ?? data?.storeName,
      req.user.id,
      id,
    ]);

    if (result.affectedRows === 0) {
      return statusHandeler(res, 404, false, "Vendor not found");
    }

    statusHandeler(
      res,
      200,
      true,
      `${name ?? data?.name} vendor updated successfully`
    );
  } catch (err) {
    statusHandeler(res, 500, false, "Error updating vendor");
  }
};

module.exports = {
  createVendor,
  getVendor,
  updateVendor,
  deleteVendor,
};
