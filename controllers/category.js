const { connection, createConnection } = require("../database");
const { paginateQuery } = require("../helper/paginationHelper");
const { requiredFieldHandler } = require("../helper/requiredFieldHandler");
const { statusHandeler } = require("../helper/statusHandler");

const createCategory = async (req, res) => {
  const { name, specification, brands } = req.body;
  const requiredFields = { name, specification };

  if (requiredFieldHandler(res, requiredFields)) return; // 👈 ADD THIS RETURN

  try {
    const connect = await createConnection();

    const [rows] = await connect.execute(
      "SELECT * FROM category WHERE name = ?",
      [name]
    );
    const [userRows] = await connect.execute(
      "SELECT id, createdBy FROM users WHERE id = ?",
      [req?.user?.id]
    );

    const createdUnder =
      req.user.role !== "Admin" ? userRows?.[0]?.createdBy : req.user.id;
    if (rows.length > 0) {
      return statusHandeler(res, 400, false, "Category name already exists");
    }

    await connect.execute(
      "INSERT INTO category (name, specification, brands, createdUnder, createdBy) VALUES (?, ?, ?, ?, ?)",
      [name, specification, brands, createdUnder, req.user.id]
    );

    await connect.end();

    return statusHandeler(res, 201, true, "Category created successfully");
  } catch (error) {
    console.error("Error:", error);
    return statusHandeler(res, 500, false, "Internal Server error");
  }
};

const getCategory = async (req, res) => {
  const { page = 1, pageSize = 10, searchText = "" } = req.query;

  try {
    const [userRows] = await connection.query(
      "SELECT id, createdBy FROM users WHERE id = ?",
      [req?.user?.id]
    );
    let createdUnder =
      req?.user?.role !== "Admin" ? userRows?.[0]?.createdBy : req?.user?.id;
    const whereClause = `WHERE createdUnder = ?`;
    const queryParams = [createdUnder];

    const { rows, pagenation } = await paginateQuery({
      connection,
      baseQuery: `SELECT * FROM category ${whereClause}`,
      countQuery: `SELECT COUNT(*) as total FROM category ${whereClause}`,
      searchText,
      page,
      pageSize,
      searchField: "name",
      queryParams,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagenation,
    });
  } catch (err) {
    console.error("Error retrieving category:", err);
    statusHandeler(res, 500, false, "Error retrieving category");
  }
};

const getCategoryName = async (req, res) => {
  try {
    const [rows] = await connection.query("SELECT id, name FROM category ");
    const data = rows;
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Error retrieving category:", err);
    statusHandeler(res, 500, false, "Error retrieving category");
  }
};

const getCategoryDetailsById = async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await connection.query(
      "SELECT * FROM category where id = ?",
      [id]
    );
    const data = rows;
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Error retrieving store:", err);
    statusHandeler(res, 500, false, "Error retrieving category");
  }
};

const deleteCategory = async (req, res) => {
  const id = req.params.id;
  const query = "DELETE FROM category WHERE id = ?";

  try {
    const [result] = await connection.execute(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).send({
        success: false,
        messege: `Category not found`,
      });
    }
    statusHandeler(
      res,
      200,
      true,
      `Category with ID ${id} deleted successfully`
    );
  } catch (err) {
    statusHandeler(res, 500, false, "Error deleting Category");
  }
};

const updateCategory = async (req, res) => {
  const id = req.params.id;
  const { name, brands, specification } = req.body;
  const query =
    "UPDATE category SET name = ?, brands = ?, specification = ? WHERE id = ?";

  try {
    const [rows] = await connection.query(
      "SELECT * FROM category WHERE id = ?",
      [id]
    );
    const data = rows?.[0];
    const [result] = await connection.execute(query, [
      name ?? data?.name,
      brands ?? data?.brands,
      specification ?? data?.specification,
      id,
    ]);

    if (result.affectedRows === 0) {
      return statusHandeler(res, 404, false, "Category not found");
    }

    statusHandeler(
      res,
      200,
      true,
      `${name ?? data?.name} updated successfully`
    );
  } catch (err) {
    statusHandeler(res, 500, false, "Error updating category");
  }
};

module.exports = {
  createCategory,
  getCategory,
  updateCategory,
  deleteCategory,
  getCategoryName,
  getCategoryDetailsById,
};
