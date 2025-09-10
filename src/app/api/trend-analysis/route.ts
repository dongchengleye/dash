import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/database';

// 计算移动平均
function calculateMovingAverage(data: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(data[i]);
    } else {
      const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / window);
    }
  }
  return result;
}

// 计算趋势方向
function calculateTrend(data: number[]): { direction: string; strength: number; slope: number } {
  if (data.length < 2) {
    return { direction: 'stable', strength: 0, slope: 0 };
  }

  // 使用线性回归计算趋势
  const n = data.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = data;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const strength = Math.abs(slope);

  let direction = 'stable';
  if (slope > 0.01) {
    direction = 'increasing';
  } else if (slope < -0.01) {
    direction = 'decreasing';
  }

  return { direction, strength, slope };
}

// 检测异常值
function detectAnomalies(data: number[], threshold: number = 2): { indices: number[]; values: number[] } {
  if (data.length < 3) {
    return { indices: [], values: [] };
  }

  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);

  const anomalies: { indices: number[]; values: number[] } = { indices: [], values: [] };

  data.forEach((value, index) => {
    const zScore = Math.abs((value - mean) / stdDev);
    if (zScore > threshold) {
      anomalies.indices.push(index);
      anomalies.values.push(value);
    }
  });

  return anomalies;
}

// 计算变化率
function calculateChangeRate(data: number[]): number[] {
  const changeRates: number[] = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i - 1] !== 0) {
      const rate = ((data[i] - data[i - 1]) / data[i - 1]) * 100;
      changeRates.push(rate);
    } else {
      changeRates.push(0);
    }
  }
  return changeRates;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const app = decodeURIComponent(searchParams.get('app') || '');
    const country = decodeURIComponent(searchParams.get('country') || '');
    const bidType = decodeURIComponent(searchParams.get('bid_type') || '');
    const channel = searchParams.get('channel');
    const roiType = searchParams.get('roi_type') || 'roi_7_day'; // 默认分析7天ROI
    const days = parseInt(searchParams.get('days') || '30'); // 分析最近30天

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
    if (channel && channel !== 'null') {
      conditions.push('channel = ?');
      params.push(channel);
    } else {
      conditions.push('channel IS NULL');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 查询历史数据 - 先查询所有数据，然后取最近的记录
    const query = `
      SELECT 
        date,
        ${roiType} as roi_value,
        installs
      FROM roi_data 
      ${whereClause}
      ORDER BY date DESC
      LIMIT ${days}
    `;

    console.log('Trend Analysis Query:', query);
    console.log('Trend Analysis Params:', params);

    const connection = await getDbConnection();
    
    try {
      const [rows] = await connection.execute(query, params);
      
      console.log('Trend Analysis rows found:', (rows as any[]).length);
      const data = rows as any[];

      if (data.length < 3) {
        return NextResponse.json({
          success: false,
          error: '数据不足，无法进行趋势分析（至少需要3天数据）'
        }, { status: 400 });
      }

    // 提取ROI值和安装量
    const roiValues = data.map(row => parseFloat(row.roi_value) || 0);
    const installValues = data.map(row => parseInt(row.installs) || 0);
    const dates = data.map(row => row.date);

    // 计算移动平均（7天）
    const roiMovingAvg = calculateMovingAverage(roiValues, Math.min(7, roiValues.length));
    const installMovingAvg = calculateMovingAverage(installValues, Math.min(7, installValues.length));

    // 计算趋势
    const roiTrend = calculateTrend(roiValues);
    const installTrend = calculateTrend(installValues);

    // 检测异常值
    const roiAnomalies = detectAnomalies(roiValues);
    const installAnomalies = detectAnomalies(installValues);

    // 计算变化率
    const roiChangeRates = calculateChangeRate(roiValues);
    const installChangeRates = calculateChangeRate(installValues);

    // 计算相关性（ROI与安装量）
    let correlation = 0;
    if (roiValues.length > 1) {
      const n = roiValues.length;
      const sumRoi = roiValues.reduce((a, b) => a + b, 0);
      const sumInstall = installValues.reduce((a, b) => a + b, 0);
      const sumRoiInstall = roiValues.reduce((sum, roi, i) => sum + roi * installValues[i], 0);
      const sumRoiSq = roiValues.reduce((sum, roi) => sum + roi * roi, 0);
      const sumInstallSq = installValues.reduce((sum, install) => sum + install * install, 0);

      const numerator = n * sumRoiInstall - sumRoi * sumInstall;
      const denominator = Math.sqrt((n * sumRoiSq - sumRoi * sumRoi) * (n * sumInstallSq - sumInstall * sumInstall));
      
      if (denominator !== 0) {
        correlation = numerator / denominator;
      }
    }

    // 生成分析报告
    const analysis = {
      summary: {
        total_days: data.length,
        avg_roi: roiValues.reduce((a, b) => a + b, 0) / roiValues.length,
        avg_installs: installValues.reduce((a, b) => a + b, 0) / installValues.length,
        roi_trend: roiTrend,
        install_trend: installTrend,
        correlation: correlation
      },
      trends: {
        roi: {
          direction: roiTrend.direction,
          strength: roiTrend.strength,
          slope: roiTrend.slope,
          moving_average: roiMovingAvg,
          change_rates: roiChangeRates
        },
        installs: {
          direction: installTrend.direction,
          strength: installTrend.strength,
          slope: installTrend.slope,
          moving_average: installMovingAvg,
          change_rates: installChangeRates
        }
      },
      anomalies: {
        roi: {
          count: roiAnomalies.indices.length,
          indices: roiAnomalies.indices,
          values: roiAnomalies.values,
          dates: roiAnomalies.indices.map(i => dates[i])
        },
        installs: {
          count: installAnomalies.indices.length,
          indices: installAnomalies.indices,
          values: installAnomalies.values,
          dates: installAnomalies.indices.map(i => dates[i])
        }
      },
      data: data.map((row, index) => ({
        date: row.date,
        roi_value: roiValues[index],
        installs: installValues[index],
        roi_moving_avg: roiMovingAvg[index],
        install_moving_avg: installMovingAvg[index],
        roi_change_rate: index > 0 ? roiChangeRates[index - 1] : 0,
        install_change_rate: index > 0 ? installChangeRates[index - 1] : 0
      }))
    };

      return NextResponse.json({
        success: true,
        data: analysis,
        metadata: {
          roi_type: roiType,
          analysis_period: days,
          filters: { app, country, bidType, channel }
        }
      });
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('趋势分析API错误:', error);
    return NextResponse.json({
      success: false,
      error: '趋势分析失败'
    }, { status: 500 });
  }
}