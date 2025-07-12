const { connection, createConnection } = require("../database");
const { nullCheckHandler } = require("../helper/nullCheckHandler");
const { paginateQuery } = require("../helper/paginationHelper");
const { requiredFieldHandler } = require("../helper/requiredFieldHandler");
const { statusHandeler } = require("../helper/statusHandler");

const createProduct = async (req, res) => {
  const {
    name,
    costPrice,
    sellingPrice,
    quantity,
    tax,
    offer,
    vendor,
    description,
    categoryId,
    brand,
    storeId,
    barCode,
    specification,
  } = req.body;

  const uploadedFiles = req.files || [];
  const images = uploadedFiles.map((file) => {
    return `http://localhost:3001/uploads/${encodeURIComponent(file.filename)}`;
  });

  const requiredFields = {
    name,
    costPrice,
    sellingPrice,
    quantity,
    vendor,
    description,
    categoryId,
    storeId,
    barCode,
    specification,
  };
  if (requiredFieldHandler(res, requiredFields)) return;

  const categoryError = await nullCheckHandler(
    res,
    "category",
    "id",
    categoryId
  );
  if (categoryError)
    return statusHandeler(res, 400, false, `Category not found`);

  const storeError = await nullCheckHandler(res, "store", "id", storeId);
  if (storeError) return statusHandeler(res, 400, false, `Store not found`);

  try {
    const connect = await createConnection();
    const [userRows] = await connect.execute(
      "SELECT id, createdBy FROM users WHERE id = ?",
      [req?.user?.id]
    );

    const createdUnder =
      req.user.role !== "Admin" ? userRows?.[0]?.createdBy : req.user.id;

    await connect.execute(
      "INSERT INTO product (name, costPrice, sellingPrice, quantity, tax, offer, vendor, description, categoryId, brand, storeId, barCode, specification, images, createdUnder, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        name,
        costPrice,
        sellingPrice,
        quantity,
        tax ?? 0,
        offer ?? 0,
        vendor,
        description,
        categoryId,
        brand ?? "No brand",
        storeId,
        barCode,
        specification,
        JSON.stringify(images),
        createdUnder,
        req.user?.id,
      ]
    );

    await connect.end();

    return statusHandeler(res, 201, true, "Product created successfully");
  } catch (error) {
    console.error("Error:", error);
    return statusHandeler(res, 500, false, "Internal Server error");
  }
};

const getProduct = async (req, res) => {
  const {
    page = 1,
    pageSize = 10,
    searchText = "",
    vendor,
    storeId,
    categoryId,
  } = req.query;
  const userId = req?.user?.id;

  try {
    const connect = await createConnection();
    const [userRows] = await connect.execute(
      "SELECT id, createdBy FROM users WHERE id = ?",
      [userId]
    );
    const createdUnder =
      req.user.role !== "Admin" ? userRows?.[0]?.createdBy : userId;

    const hasStoreId =
      storeId !== undefined && storeId !== null && storeId.trim() !== "";

    const { rows, pagenation } = await paginateQuery({
      connection,
      baseQuery: `SELECT * FROM product WHERE createdUnder = ?  ${
        hasStoreId ? " AND storeId = ?" : ""
      } ${vendor ? " AND vendor = ?" : ""} ${
        categoryId ? " AND categoryId = ?" : ""
      }`,
      countQuery: `SELECT * FROM product WHERE createdUnder = ?  ${
        hasStoreId ? " AND storeId = ?" : ""
      } ${vendor ? " AND vendor = ?" : ""} ${
        categoryId ? " AND categoryId = ?" : ""
      }`,
      searchText,
      page,
      pageSize,
      searchField: "name",
      queryParams: vendor
        ? [createdUnder, vendor]
        : storeId
        ? [createdUnder, storeId]
        : [createdUnder],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagenation,
    });
  } catch (err) {
    console.error("Error retrieving product:", err);
    statusHandeler(res, 500, false, "Error retrieving product");
  }
};

const getProductForUser = async (req, res) => {
  const {
    storeId = req?.user?.storeId,
    stock,
    pageSize = 10,
    page = 1,
    categoryId,
    searchText = "",
  } = req.query;

  const isStock = stock === "true";
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  const [salesRows] = await connection.query(
    `SELECT * FROM sales WHERE storeId = ? ORDER BY createdAt DESC`,
    [storeId]
  );

  const flatSales = salesRows?.flatMap((record) => {
    const { createdBy, createdAt, storeId, sales } = record;
    const parsedSales = typeof sales === "string" ? JSON.parse(sales) : sales;

    return parsedSales?.map((sale) => ({
      ...sale,
      createdBy,
      createdAt,
      storeId,
      quantity: 1,
    }));
  });

  const mergedMap = new Map();
  flatSales?.forEach((item) => {
    const key = `${item?.barCode}-${item?.storeId}`;
    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key);
      mergedMap.set(key, {
        ...existing,
        quantity: existing.quantity + 1,
      });
    } else {
      mergedMap.set(key, { ...item });
    }
  });

  const mergedSales = Array.from(mergedMap.values());

  try {
    const params = [];
    const whereClauses = [];

    if (categoryId) {
      whereClauses.push("categoryId = ?");
      params.push(categoryId);
    }

    if (storeId) {
      whereClauses.push("storeId = ?");
      params.push(storeId);
    }

    if (searchText) {
      whereClauses.push(`(name LIKE ? OR barCode LIKE ?)`);
      const likeSearch = `%${searchText}%`;
      params.push(likeSearch, likeSearch);
    }

    const whereSQL = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

    const [countRows] = await connection.query(
      `SELECT COUNT(*) as total FROM product ${whereSQL}`,
      params
    );
    const total = countRows[0]?.total || 0;
    const totalPages = Math.ceil(total / parseInt(pageSize));

    const productQuery = `
      SELECT id, images, offer, name, categoryId, createdBy, vendor, barCode, quantity, sellingPrice 
      FROM product 
      ${whereSQL}
      ORDER BY createdAt DESC 
      LIMIT ? OFFSET ?
    `;
    const [productRows] = await connection.query(productQuery, [
      ...params,
      parseInt(pageSize),
      offset,
    ]);

    const updatedProducts = productRows?.map((product) => {
      const saleMatch = mergedSales?.find(
        (sale) =>
          sale?.barCode === product?.barCode && sale?.storeId === storeId
      );

      const adjustedQuantity = product?.quantity - (saleMatch?.quantity || 0);

      return {
        ...product,
        quantity: adjustedQuantity < 0 ? 0 : adjustedQuantity,
        sold: saleMatch?.quantity ?? 0,
      };
    });

    const filteredProducts = updatedProducts?.filter(
      (item) => item.quantity > 0
    );
    const outOfStockProducts = updatedProducts?.filter(
      (item) => item.quantity === 0
    );

    const paginatedData = isStock ? filteredProducts : outOfStockProducts;

    return res.status(200).json({
      success: true,
      pagenation: {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages,
      },
      data: paginatedData,
    });
  } catch (err) {
    console.error("Error retrieving product:", err);
    statusHandeler(res, 500, false, "Error retrieving product");
  }
};

const getProductByBarcode = async (req, res) => {
  const { barCode, storeId, addProduct, limit = 1 } = req.query;

  const isAddProduct = addProduct === "true";

  try {
    const [rows] = await connection.query(
      `SELECT ${
        isAddProduct
          ? "*"
          : "id, images, offer, name, categoryId, createdBy, vendor, barCode, quantity, sellingPrice"
      } FROM product 
       WHERE barCode = ? AND storeId = ? 
       ORDER BY createdAt DESC 
       LIMIT ${limit}`,
      [barCode, storeId]
    );

    return res.status(200).json({ success: true, data: rows || null });
  } catch (err) {
    console.error("Error retrieving product:", err);
    statusHandeler(res, 400, false, err);
  }
};

const deleteProduct = async (req, res) => {
  const id = req.params.id;
  const query = "DELETE FROM product WHERE id = ?";

  try {
    const [result] = await connection.execute(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).send({
        success: false,
        messege: `Product not found`,
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

const updateProduct = async (req, res) => {
  const {
    id,
    name,
    costPrice,
    sellingPrice,
    quantity,
    tax,
    offer,
    vendor,
    description,
    categoryId,
    brand,
    images,
    storeId,
    barCode,
    specification,
  } = req.body;

  const requiredFields = {
    id,
    name,
    costPrice,
    sellingPrice,
    quantity,
    vendor,
    description,
    categoryId,
    storeId,
    barCode,
    specification,
  };
  if (requiredFieldHandler(res, requiredFields)) return;

  const categoryError = await nullCheckHandler(
    res,
    "category",
    "id",
    categoryId
  );

  console.log("specification", specification);
  const safeSpecification = JSON.parse(JSON.stringify(specification));
  if (categoryError)
    return statusHandeler(res, 400, false, `Category not found`);

  const storeError = await nullCheckHandler(res, "store", "id", storeId);
  if (storeError) return statusHandeler(res, 400, false, `Store not found`);

  try {
    const connect = await createConnection();

    const [rows] = await connection.query(
      "SELECT * FROM product WHERE id = ?",
      [id]
    );
    const data = rows?.[0];

    await connect.execute(
      `UPDATE product SET 
    name = ?, 
    costPrice = ?, 
    sellingPrice = ?, 
    quantity = ?, 
    tax = ?, 
    offer = ?, 
    vendor = ?, 
    description = ?, 
    categoryId = ?, 
    brand = ?, 
    storeId = ?, 
    barCode = ?, 
    specification = ?, 
    images = ?, 
    createdUnder = ?, 
    updatedBy = ?
  WHERE id = ?`,
      [
        name ?? data?.name,
        costPrice ?? data?.costPrice,
        sellingPrice ?? data?.sellingPrice,
        quantity ?? data?.quantity,
        tax ?? data?.tax ?? 0,
        offer ?? data?.offer ?? 0,
        vendor ?? data?.vendor,
        description ?? data?.description,
        categoryId ?? data?.categoryId,
        brand ?? data?.brand ?? "No brand",
        storeId ?? data?.storeId,
        barCode ?? data?.barCode,
        safeSpecification,
        JSON.stringify(images),
        data?.createdUnder,
        req.user?.id,
        id,
      ]
    );

    await connect.end();

    return statusHandeler(res, 201, true, "Product updated successfully");
  } catch (error) {
    console.error("Error:", error);
    return statusHandeler(res, 500, false, "Internal Server error");
  }
};

module.exports = {
  getProductForUser,
  getProductByBarcode,
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
};
