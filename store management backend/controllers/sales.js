const { connection, createConnection } = require("../database");
const { requiredFieldHandler } = require("../helper/requiredFieldHandler");
const { statusHandeler } = require("../helper/statusHandler");

const createSales = async (req, res) => {
  const { sales, storeId = req?.user?.storeId } = req.body;

  const requiredFields = {
    sales,
  };
  if (requiredFieldHandler(res, requiredFields)) return;

  try {
    const connect = await createConnection();

    if (!storeId) {
      return res
        .status(400)
        .json({ success: false, message: "Not login to the store" });
    }

    await connect.execute(
      "INSERT INTO sales (sales, storeId, createdBy) VALUES (?, ?, ?)",
      [sales, storeId ?? "", req?.user?.firstName ?? req?.user?.name]
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
  console.log("storeId", storeId);

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
    } else if (isAdmin) {
      // Admin: Get sales from all stores they created
      const [storeRows] = await connection.query(
        `SELECT id FROM store WHERE createdBy = ?`,
        [userId]
      );

      const storeIds = storeRows.map((store) => store?.id);

      if (!storeIds.length) {
        return res.status(200).json({
          success: true,
          data: [],
          pagenation: { total: 0, page: currentPage, pageSize: limit },
        });
      }

      const placeholders = storeIds.map(() => "?").join(", ");
      whereClause = `WHERE storeId IN (${placeholders})`;
      salesParams = [...storeIds];
    } else {
      // Staff: Only see their own store's sales for the selected date
      whereClause = `WHERE storeId = ? AND DATE(createdAt) = ?`;
      salesParams = [storeId, targetDate];
    }

    const salesQuery = `
      SELECT * FROM sales 
      ${whereClause}
      ORDER BY createdAt DESC
    `;

    const [rows] = await connection.query(salesQuery, salesParams);

    const flatSales =
      rows?.flatMap((record) => {
        const { createdBy, createdAt, storeId, sales } = record;
        const parsedSales =
          typeof sales === "string" ? JSON.parse(sales) : sales;

        return parsedSales?.map((sale) => ({
          ...sale,
          createdBy,
          createdAt,
          storeId,
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
  deleteStore,
};
