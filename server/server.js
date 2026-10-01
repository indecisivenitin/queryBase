// import app from './src/app.js';
// import pool from './src/db.js';

// const port = 8080;

// const startServer = async () => {
//     try {

//         await pool.query('SELECT 1');

//         console.log('Connected to the database');

//         app.listen(port, '0.0.0.0', () => {
//             console.log(`Server is running on port ${port}`);
//         });

//     } catch (error) {

//         console.error('Error connecting to the database:', error);
//         process.exit(1);

//     }
// };

// startServer();



import app from './src/app.js';
import pool from './src/db.js';

const port = process.env.PORT || 8080;

const startServer = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('Connected to the database');

    // Temporary: replaced by real migrations in Phase 1
    await pool.query(
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        age INT NOT NULL
      )`
    );

    app.listen(port, '0.0.0.0', () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Error connecting to the database:', error);
    process.exit(1);
  }
};

startServer();