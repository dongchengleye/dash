import { NextRequest, NextResponse } from 'next/server';
import { RoiTrend } from '@/data/models/roi';
import { getDbConnection } from '@/lib/database';

// 计算趋势方向和强度
function calculateTrend(values: number[]): { direction: 'up' | 'down' | 'stable'; strength: number } {
  if (values.length < 2) {
    return { direction: 'stable', strength: 0 };
  }
  
  // 计算线性回归斜率
  const n = values.length;
  const xValues = Array.from({ length: n }, (_, i) => i);
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  
  // 计算R²来衡量趋势强度
  const meanY = sumY / n;
  const ssTotal = values.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
  const ssResidual = values.reduce((sum, y, i) => {
    const predicted = slope * i + (sumY - slope * sumX) / n;
    return sum + Math.pow(y - predicted, 2);
  }, 0);
  
  const rSquared = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;
  const strength = Math.max(0, Math.min(1, rSquared));
  
  // 确定趋势方向
  const threshold = 0.001; // 斜率阈值
  let direction: 'up' | 'down' | 'stable';
  
  if (Math.abs(slope) < threshold) {
    direction = 'stable';
  } else if (slope > 0) {
    direction = 'up';
  } else {
    direction = 'down';
  }
  
  return { direction, strength };
}

// 检测异常值
function detectAnomalies(values: number[], dates: string[]): Array<{
  date: string;
  value: number;
  expected: number;
  deviation: number;
}> {
  if (values.length < 7) {
    return [];
  }
  
  const anomalies: Array<{
    date: string;
    value: number;
    expected: number;
    deviation: number;
  }> = [];
  
  // 使用移动平均和标准差检测异常
  const windowSize = Math.min(7, Math.floor(values.length / 3));
  
  for (let i = windowSize; i < values.length; i++) {
    const window = values.slice(i - windowSize, i);
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
    const stdDev = Math.sqrt(variance);
    
    const currentValue = values[i];
    const deviation = Math.abs(currentValue - mean);
    
    // 如果偏差超过2个标准差，认为是异常
    if (stdDev > 0 && deviation > 2 * stdDev) {
      anomalies.push({
        date: dates[i],
        value: currentValue,
        expected: mean,
        deviation: deviation / stdDev // 标准化偏差
      });
    }
  }
  
  return anomalies;
}

// GET 请求处理器 - 获取趋势分析
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const app = searchParams.get('app');
    const country = searchParams.get('country');
    const bidType = searchParams.get('bid_type');
    const channel = searchParams.get('channel');
    const period = searchParams.get('period') || '30'; // 分析周期（天数）
    const roiType = searchParams.get('roi_type') || 'roi_7_day'; // ROI类型
    
    // 验证ROI类型
    const validRoiTypes = ['roi_today', 'roi_1_day', 'roi_3_day', 'roi_7_day', 'roi_14_day', 'roi_30_day', 'roi_60_day', 'roi_90_day'];
    if (!validRoiTypes.includes(roiType)) {
      return NextResponse.json({
        success: false,
        error: '无效的ROI类型'
      }, { status: 400 });
    }
    
    // 构建WHERE条件
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (app) {
      conditions.push('app = ?');
      params.push(app);
    }
    
    if (country) {
      conditions.push('country = ?');
      params.push(country);
    }
    
    if (bidType) {
      conditions.push('bid_type = ?');
      params.push(bidType);
    }
    
    if (channel) {
      conditions.push('channel = ?');
      params.push(channel);
    }
    
    // 添加时间范围条件
    conditions.push('date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)');
    params.push(parseInt(period));
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // 查询历史数据
    const dataQuery = `
      SELECT 
        date,
        ${roiType} as roi_value
      FROM roi_data 
      ${whereClause}
      ORDER BY date ASC
    `;
    
    const connection = await getDbConnection();
    
    try {
      const [rows] = await connection.execute(dataQuery, params);
      
      if ((rows as any[]).length < 7) {
        return NextResponse.json({
          success: false,
          error: '数据不足，无法进行趋势分析（至少需要7天数据）'
        }, { status: 400 });
    }
    
      // 提取数据
      const dates = (rows as any[]).map((row: any) => row.date);
      const values = (rows as any[]).map((row: any) => parseFloat(row.roi_value) || 0);
    
      // 计算趋势
      const trend = calculateTrend(values);
      
      // 检测异常
      const anomalies = detectAnomalies(values, dates);
    
      // 构建响应
      const trendAnalysis: RoiTrend = {
        period: `${period}天`,
        trend_direction: trend.direction,
        trend_strength: Math.round(trend.strength * 100) / 100,
        anomalies: anomalies.map(anomaly => ({
          ...anomaly,
          value: Math.round(anomaly.value * 10000) / 10000,
          expected: Math.round(anomaly.expected * 10000) / 10000,
          deviation: Math.round(anomaly.deviation * 100) / 100
        }))
      };
      
      return NextResponse.json({
        success: true,
        data: trendAnalysis,
        metadata: {
          data_points: (rows as any[]).length,
          roi_type: roiType,
          analysis_period: period,
          filters: { app, country, bidType, channel }
        }
      });
    } finally {
      connection.release();
    }
    
  } catch (error) {
    // 趋势分析失败
    return NextResponse.json(
      { 
        success: false, 
        error: '趋势分析失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}