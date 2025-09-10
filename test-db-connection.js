const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('测试数据库连接...');
  console.log('数据库配置:');
  console.log('Host:', process.env.DB_HOST || 'localhost');
  console.log('User:', process.env.DB_USER || 'dash');
  console.log('Database:', process.env.DB_NAME || 'energy_dashboard');
  console.log('Password:', process.env.DB_PASSWORD ? '***已设置***' : '未设置');
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'dash',
    password: process.env.DB_PASSWORD || '30TasHi!@#',
    database: process.env.DB_NAME || 'energy_dashboard',
    charset: 'utf8mb4'
  };
  
  try {
    console.log('\n尝试连接数据库...');
    const connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功!');
    
    // 测试查询
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ 查询测试成功:', rows);
    
    // 检查表是否存在
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 数据库中的表:', tables.map(t => Object.values(t)[0]));
    
    await connection.end();
    console.log('✅ 连接已关闭');
  } catch (error) {
    console.error('❌ 数据库连接失败:');
    console.error('错误代码:', error.code);
    console.error('错误信息:', error.message);
    console.error('SQL状态:', error.sqlState);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n🔧 可能的解决方案:');
      console.log('1. 检查数据库用户名和密码是否正确');
      console.log('2. 确保MySQL服务正在运行');
      console.log('3. 检查用户是否有访问数据库的权限');
      console.log('4. 尝试在MySQL中运行: GRANT ALL PRIVILEGES ON energy_dashboard.* TO \'dash\'@\'localhost\';');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 可能的解决方案:');
      console.log('1. 启动MySQL服务: brew services start mysql (macOS)');
      console.log('2. 检查MySQL是否在端口3306运行');
    }
  }
}

testConnection();