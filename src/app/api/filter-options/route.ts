import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/database';

export async function GET() {
  try {
    // 获取所有筛选器选项
    const connection = await getDbConnection();
    
    try {
      const [countries] = await connection.execute(
        'SELECT DISTINCT country FROM roi_data WHERE country IS NOT NULL ORDER BY country'
      );
      
      const [bidTypes] = await connection.execute(
        'SELECT DISTINCT bid_type FROM roi_data WHERE bid_type IS NOT NULL ORDER BY bid_type'
      );
      
      const [channels] = await connection.execute(
        'SELECT DISTINCT channel FROM roi_data WHERE channel IS NOT NULL ORDER BY channel'
      );
      
      const [apps] = await connection.execute(
        'SELECT DISTINCT app FROM roi_data WHERE app IS NOT NULL ORDER BY app'
      );
    
      return NextResponse.json({
         success: true,
         countries: (countries as any[]).map((row: any) => row.country),
         bidTypes: (bidTypes as any[]).map((row: any) => row.bid_type),
         channels: (channels as any[]).map((row: any) => row.channel).filter((channel: string) => channel !== 'organic'),
         apps: (apps as any[]).map((row: any) => row.app)
       });
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Database connection failed:', error);
    
    // 如果数据库连接失败，返回默认筛选器选项
     return NextResponse.json({
       success: true,
       countries: ['美国', '中国', '日本'],
       bidTypes: ['CPI', 'CPM', 'CPC'],
       channels: ['Facebook', 'Google', 'TikTok'],
       apps: ['App-1', 'App-2']
     });
  }
}