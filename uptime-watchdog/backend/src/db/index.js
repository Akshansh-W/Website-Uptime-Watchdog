const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:             process.env.DB_HOST,
  port:             parseInt(process.env.DB_PORT) || 3306,
  user:             process.env.DB_USER,
  password:         process.env.DB_PASSWORD,
  database:         process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:  10,
  timezone:         'Z',
});

async function initDB() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    await conn.query(`USE \`${process.env.DB_NAME}\``);

    // ── users ─────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        name        VARCHAR(100)  NOT NULL,
        email       VARCHAR(255)  NOT NULL UNIQUE,
        password    VARCHAR(255)  NOT NULL,
        phone       VARCHAR(20)   DEFAULT NULL,
        sms_alerts  TINYINT(1)    DEFAULT 0,
        created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── monitors ──────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS monitors (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        user_id         INT          NOT NULL,
        url             VARCHAR(500) NOT NULL,
        label           VARCHAR(100) NOT NULL,
        status          ENUM('up','down','pending') DEFAULT 'pending',
        uptime          DECIMAL(5,2) DEFAULT NULL,
        response_time   INT          DEFAULT NULL,
        last_checked    TIMESTAMP    NULL,
        alert_email     VARCHAR(255) DEFAULT NULL,
        alert_slack     VARCHAR(500) DEFAULT NULL,
        check_interval  INT          DEFAULT 30,
        created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // ── ping_history ──────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ping_history (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        monitor_id    INT          NOT NULL,
        status        ENUM('up','down') NOT NULL,
        response_time INT          DEFAULT NULL,
        checked_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
      )
    `);

    // ── api_checks ────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS api_checks (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        monitor_id  INT          NOT NULL,
        label       VARCHAR(100) NOT NULL,
        url         VARCHAR(500) NOT NULL,
        method      ENUM('GET','POST','PUT','DELETE','PATCH') DEFAULT 'GET',
        headers     JSON         DEFAULT NULL,
        body        JSON         DEFAULT NULL,
        created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
      )
    `);

    // ── api_test_cases ────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS api_test_cases (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        api_check_id    INT          NOT NULL,
        description     VARCHAR(200) NOT NULL,
        assert_type     ENUM('status_code','body_contains','body_json_field','response_time_lt') NOT NULL,
        expected_value  VARCHAR(500) NOT NULL,
        json_path       VARCHAR(200) DEFAULT NULL,
        FOREIGN KEY (api_check_id) REFERENCES api_checks(id) ON DELETE CASCADE
      )
    `);

    // ── api_check_results ─────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS api_check_results (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        api_check_id   INT          NOT NULL,
        monitor_id     INT          NOT NULL,
        status         ENUM('pass','fail','error') NOT NULL,
        status_code    INT          DEFAULT NULL,
        response_time  INT          DEFAULT NULL,
        response_body  TEXT         DEFAULT NULL,
        error_msg      VARCHAR(500) DEFAULT NULL,
        test_results   JSON         DEFAULT NULL,
        checked_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (api_check_id) REFERENCES api_checks(id) ON DELETE CASCADE
      )
    `);

    // ── alert_log ─────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS alert_log (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        monitor_id  INT          NOT NULL,
        type        ENUM('down','recovered') NOT NULL,
        channel     ENUM('email','sms','slack') NOT NULL,
        recipient   VARCHAR(255) NOT NULL,
        sent_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Database connected and all tables ready');
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDB };
