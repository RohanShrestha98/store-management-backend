const paginateQuery = async ({
  connection,
  baseQuery,
  countQuery,
  searchText = "",
  page = 1,
  pageSize = 10,
  searchField = "name",
  queryParams = [],
}) => {
  const offset = (page - 1) * pageSize;
  const limit = parseInt(pageSize);

  const filters = [];
  const filterParams = [];

  if (searchText.trim()) {
    filters.push(`${searchField} LIKE ?`);
    filterParams.push(`%${searchText}%`);
  }

  const whereClause = filters.length ? " AND " + filters.join(" AND ") : "";

  const [countRows] = await connection.query(`${countQuery}${whereClause}`, [
    ...queryParams,
    ...filterParams,
  ]);
  const total = countRows?.[0]?.total;

  const [rows] = await connection.query(
    `${baseQuery}${whereClause}  ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
    [...queryParams, ...filterParams, limit, offset]
  );

  return {
    rows,
    pagenation: {
      total,
      page: parseInt(page),
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = { paginateQuery };
