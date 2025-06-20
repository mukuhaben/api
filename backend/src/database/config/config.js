import { config } from 'dotenv';
config();

const databaseConfig = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    dialect: 'postgres',
    node_env: process.env.NODE_ENV,
    PORT: process.env.PORT || 9000,
    requestTimeout: 300000000,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? { require: true, rejectUnauthorized: false } : false,
    },
    logging: false,
    timezone: 'UTC',
    pool: {
      max: 300,
      min: 5,
      acquire: 60000,
      idle: 10000,
    },
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    dialect: 'postgres',
    node_env: process.env.NODE_ENV,
    PORT: process.env.PORT || 9000,
    requestTimeout: 300000000,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? { require: true, rejectUnauthorized: false } : false,
    },
    logging: console.log,
    timezone: 'UTC',
    pool: {
      max: 300,
      min: 5,
      acquire: 60000,
      idle: 60000,
    },
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    dialect: 'postgres',
    node_env: process.env.NODE_ENV,
    requestTimeout: 300000000,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? { require: true, rejectUnauthorized: false } : false,
    },
    timezone: 'UTC',
    pool: {
      max: 300,
      min: 5,
      acquire: 60000,
      idle: 20000,
    },
  },
};

export default databaseConfig;
