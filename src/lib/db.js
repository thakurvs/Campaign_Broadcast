import mysql from "mysql2/promise";

// Create a connection pool (reuses connections instead of opening new ones each time)
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "campaign_broadcast",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
