import { mockRoiData } from '../models/__mocks__/roi';
import { RoiData } from '../models/roi';
import { getDbConnection } from '@/lib/database';

export async function getRoiData(): Promise<RoiData[]> {
  // 在客户端环境中，直接返回模拟数据
  if (typeof window !== 'undefined') {
    return mockRoiData;
  }
  
  // 在服务器端，尝试从数据库获取数据
  try {
    const connection = await getDbConnection();
    
    try {
      // 检查表是否存在
      const [tables] = await connection.execute(
        'SHOW TABLES LIKE \'roi_data\''
      );
      
      if (Array.isArray(tables) && tables.length > 0) {
        // 表存在，获取数据
        const [rows] = await connection.execute('SELECT * FROM roi_data ORDER BY date DESC');
        
        if (Array.isArray(rows) && rows.length > 0) {
          return rows as RoiData[];
        }
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    // Database error
  }
  
  // 如果数据库不可用或没有数据，返回模拟数据
  return mockRoiData;
};