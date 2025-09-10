import mysql from 'mysql2/promise';

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '30TasH2i!@#',
  database: 'energy_dashboard',
  charset: 'utf8mb4',
  connectionLimit: 5,
  acquireTimeout: 10000,
  timeout: 10000,
  reconnect: true,
  waitForConnections: true,
  queueLimit: 0,
  idleTimeout: 60000,
  maxIdle: 2
};

// 创建全局连接池实例
let pool: mysql.Pool | null = null;

// 获取数据库连接池的单例函数
export function getDbPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

// 获取数据库连接
export async function getDbConnection(): Promise<mysql.PoolConnection> {
  const dbPool = getDbPool();
  return await dbPool.getConnection();
}

// 执行查询的便捷函数
export async function executeQuery<T = any>(
  query: string,
  params?: any[]
): Promise<[T[], mysql.FieldPacket[]]> {
  const connection = await getDbConnection();
  try {
    return await connection.execute(query, params) as [T[], mysql.FieldPacket[]];
  } finally {
    connection.release();
  }
}

// 关闭连接池（用于应用关闭时清理）
export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// 默认导出连接池获取函数
export default getDbPool;