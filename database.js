const mysql = require("mysql2/promise");

// Create a MySQL connection pool
const connection = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "zaq@XSW2345",
  database: "store",
});

async function createConnection() {
  const connection = await mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "zaq@XSW2345",
    database: "store",
  });

  return connection;
}

module.exports = {
  connection,
  createConnection,
};
