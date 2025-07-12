const { statusHandeler } = require("./statusHandler");
const { createConnection } = require("../database");

const nullCheckHandler = async (
  res,
  tableName,
  compare,
  compareValue,
  returnValue = false
) => {
  const connect = await createConnection();

  const [rows] = await connect.execute(
    `SELECT * FROM ${tableName} WHERE ${compare} = ?`,
    [compareValue]
  );
  console.log("rows", rows?.length);
  if (!rows?.length) {
    return true;
  }
  return false;
};

module.exports = {
  nullCheckHandler,
};
