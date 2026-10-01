// import {Pool} from 'pg'

// const port = 8080;

// let pool = new Pool({
//     user: '',
//     host: '',
//     password:'',
// })

// export default pool;

import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected idle client error', err);
});

export default pool;