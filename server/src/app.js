// import express from 'express'
// import pool from './db.js'
// const app = express();

// app.use(express.json());
// app.use(express.urlencoded({extended:true}));


// app.get('/',async(req,res)=>{
//     await pool.query('CrEATE TABLE IF NOT EXISTS users(id SERIAL PRIMARY KEY,name VARCHAR(100),age INT)');
//     res.send('successfully created table');
// })

// app.post('/users',async(req,res)=>{
//     const {name,age} = req.body;
//     const response = await pool.query('INSERT INTO users(name,age) VALUES($1,$2) ',[name,age]); 
//     res.json({message:'User added successfully',data:response})
// })

// app.get('/users',async(req,res)=>{
//     const response = await pool.query('SELECT * FROM users');
//     res.json({message:'Users fetched successfully',data:response.rows})
// })

// export default app;




import express from 'express';
import pool from './db.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT 1 FROM pg_extension WHERE extname = 'vector'"
    );
    res.json({ status: 'ok', db: 'up', pgvector: r.rowCount === 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', db: 'down' });
  }
});

// Temporary test routes, will be replaced in Phase 1
app.post('/users', async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const age = Number.parseInt(req.body.age, 10);

  if (!name || !Number.isInteger(age) || age < 0) {
    return res
      .status(400)
      .json({ message: 'name (string) and age (non-negative integer) are required' });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO users(name, age) VALUES($1, $2) RETURNING *',
      [name, age]
    );
    res.status(201).json({ message: 'User added successfully', data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users ORDER BY id');
    res.json({ message: 'Users fetched successfully', data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default app;