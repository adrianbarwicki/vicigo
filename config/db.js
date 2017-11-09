const pool  = require('mysql').createPool({
  connectionLimit: 3,	
  host: process.env.VICIGO_DB_HOST_NAME,
  post: 3306,
  user: process.env.VICIGO_DB_USER,
  password: process.env.VICIGO_DB_PASSWORD,
  database: process.env.VICIGO_DB_DATABASE	
});

module.exports = {
	pool: pool
};