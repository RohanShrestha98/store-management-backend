const { connection, createConnection } = require("../database");
const { requiredFieldHandler } = require("../helper/requiredFieldHandler");
const { statusHandeler } = require("../helper/statusHandler");

const crypto = require("crypto");

const createSales = async (req, res) => {
  const {
    sales,
    storeId = req?.user?.storeId,
    subTotal,
    quantity,
    salesTax,
    total,
  } = req.body;
  const uid = crypto.randomBytes(16).toString("hex");

  const requiredFields = {
    sales,
    total,
  };
  if (requiredFieldHandler(res, requiredFields)) return;

  try {
    const connect = await createConnection();
    const [userRows] = await connect.execute(
      "SELECT * FROM users WHERE id = ?",
      [req?.user?.id]
    );

    const createdUnder =
      req.user.role !== "Admin" ? userRows?.[0]?.createdUnder : req.user.id;

    if (!storeId) {
      return res
        .status(400)
        .json({ success: false, message: "Not login to the store" });
    }
    await connect.execute(
      "INSERT INTO sales (id, storeId, subTotal, salesTax, total, quantity, createdBy, createdUnder) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        uid,
        storeId ?? "",
        subTotal,
        salesTax,
        total,
        quantity,
        req?.user?.firstName ?? req?.user?.name,
        createdUnder,
      ]
    );

    await connect.execute(
      "INSERT INTO salesDetails (salesId, sales, storeId, subTotal, salesTax, total, quantity, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        uid,
        sales,
        storeId ?? "",
        subTotal,
        salesTax,
        total,
        quantity,
        req?.user?.firstName ?? req?.user?.name,
      ]
    );

    await connect.end();

    return statusHandeler(res, 201, true, "Product sold successfully");
  } catch (error) {
    console.error("Error:", error);
    return statusHandeler(res, 500, false, "Internal Server error");
  }
};

const getSales = async (req, res) => {
  const {
    page = 1,
    pageSize = 10,
    date,
    storeId = req?.user?.storeId,
    searchText = "",
  } = req.query;
  const userId = req?.user?.id;
  const isAdmin = req?.user?.role === "Admin";
  const targetDate = date || new Date().toISOString().split("T")[0];
  const limit = parseInt(pageSize);
  const currentPage = parseInt(page);
  const offset = (currentPage - 1) * limit;

  try {
    let whereClause = "";
    let salesParams = [];
    if (isAdmin && storeId) {
      whereClause = `WHERE storeId = ?`;
      salesParams = [storeId];
    } else if (isAdmin && !storeId) {
      whereClause = `WHERE createdUnder = ?`;
      salesParams = [userId];
    } else {
      whereClause = `WHERE storeId = ?`;
      salesParams = [storeId];
    }

    const salesQuery = `
      SELECT * FROM sales 
      ${whereClause}
      ORDER BY createdAt DESC
    `;

    const [rows] = await connection.query(salesQuery, salesParams);

    // Pagination
    const total = rows.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedData = rows.slice(offset, offset + limit);

    return res.status(200).json({
      success: true,
      data: paginatedData,
      pagenation: {
        total,
        page: currentPage,
        pageSize: limit,
        totalPages,
      },
    });
  } catch (err) {
    console.error("Error retrieving sales:", err);
    statusHandeler(res, 500, false, "Error retrieving sales");
  }
};

const getSalesDetails = async (req, res) => {
  const { page = 1, pageSize = 10, date, searchText = "" } = req.query;
  const { id: salesId } = req.params;

  const targetDate = date || new Date().toISOString().split("T")[0];
  const limit = parseInt(pageSize);
  const currentPage = parseInt(page);
  const offset = (currentPage - 1) * limit;

  try {
    const salesQuery = `
      SELECT * FROM salesDetails 
      where salesId = ? 
      ORDER BY createdAt DESC
    `;

    const [rows] = await connection.query(salesQuery, salesId);
    console.log("rows", rows);

    const flatSales =
      rows?.flatMap((record) => {
        const { createdBy, createdAt, storeId, sales, subTotal, salesTax } =
          record;
        const parsedSales =
          typeof sales === "string" ? JSON.parse(sales) : sales;

        return parsedSales?.map((sale) => ({
          ...sale,
          createdBy,
          createdAt,
          storeId,
          salesTax,
          quantity: 1,
          sellingPrice: parseFloat(sale?.sellingPrice),
          total: parseFloat(sale?.sellingPrice),
        }));
      }) || [];

    const filteredSales = searchText
      ? flatSales.filter(
          (item) =>
            item?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
            item?.barCode?.toLowerCase().includes(searchText.toLowerCase())
        )
      : flatSales;

    // Merge similar sales
    const mergedMap = new Map();
    filteredSales?.forEach((item) => {
      const key = `${item?.barCode}-${item?.createdBy}-${item?.createdAt}-${item?.storeId}-${item?.sellingPrice}`;
      if (mergedMap.has(key)) {
        const existing = mergedMap.get(key);
        mergedMap.set(key, {
          ...existing,
          quantity: existing.quantity + 1,
          total: existing.total + item.sellingPrice,
        });
      } else {
        mergedMap.set(key, { ...item });
      }
    });

    const mergedSales = Array.from(mergedMap.values());

    // Pagination
    const total = mergedSales.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedData = mergedSales.slice(offset, offset + limit);

    return res.status(200).json({
      success: true,
      data: paginatedData,
      rows,
      pagenation: {
        total,
        page: currentPage,
        pageSize: limit,
        totalPages,
      },
    });
  } catch (err) {
    console.error("Error retrieving sales:", err);
    statusHandeler(res, 500, false, "Error retrieving sales");
  }
};

const deleteStore = async (req, res) => {
  const id = req.params.id;
  const query = "DELETE FROM store WHERE id = ?";

  try {
    const [result] = await connection.execute(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).send({
        success: false,
        messege: `Store not found`,
      });
    }
    statusHandeler(res, 200, true, `Storedeleted successfully`);
  } catch (err) {
    statusHandeler(res, 500, false, "Error deleting store");
  }
};

module.exports = {
  createSales,
  getSales,
  getSalesDetails,
  deleteStore,
};
