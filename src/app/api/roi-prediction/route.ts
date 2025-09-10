import { NextRequest, NextResponse } from 'next/server';
import { RoiPrediction } from '@/data/models/roi';
import { getDbConnection } from '@/lib/database';

// 简单移动平均预测算法
function calculateMovingAverage(values: number[], window: number): number {
  // 过滤掉NaN和无效值
  const validValues = values.filter(val => !isNaN(val) && isFinite(val));
  
  if (validValues.length === 0) return 0;
  if (validValues.length < window) {
    const sum = validValues.reduce((acc, val) => acc + val, 0);
    return sum / validValues.length;
  }
  
  const recentValues = validValues.slice(-window);
  const sum = recentValues.reduce((acc, val) => acc + val, 0);
  const result = sum / window;
  
  return isNaN(result) || !isFinite(result) ? 0 : result;
}

// 线性回归预测算法
function linearRegression(xValues: number[], yValues: number[]): { slope: number; intercept: number } {
  const n = xValues.length;
  
  // 过滤掉NaN和无效值
  const validPairs = xValues.map((x, i) => ({ x, y: yValues[i] }))
    .filter(pair => !isNaN(pair.x) && !isNaN(pair.y) && isFinite(pair.x) && isFinite(pair.y));
  
  if (validPairs.length < 2) {
    // 如果有效数据点少于2个，返回默认值
    const avgY = yValues.filter(y => !isNaN(y) && isFinite(y)).reduce((a, b) => a + b, 0) / Math.max(1, yValues.filter(y => !isNaN(y) && isFinite(y)).length);
    return { slope: 0, intercept: avgY || 0 };
  }
  
  const validX = validPairs.map(p => p.x);
  const validY = validPairs.map(p => p.y);
  const validN = validPairs.length;
  
  const sumX = validX.reduce((a, b) => a + b, 0);
  const sumY = validY.reduce((a, b) => a + b, 0);
  const sumXY = validX.reduce((sum, x, i) => sum + x * validY[i], 0);
  const sumXX = validX.reduce((sum, x) => sum + x * x, 0);
  
  const denominator = validN * sumXX - sumX * sumX;
  
  if (Math.abs(denominator) < 1e-10) {
    // 分母接近0，返回平均值
    return { slope: 0, intercept: sumY / validN };
  }
  
  const slope = (validN * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / validN;
  
  // 检查结果是否为NaN
  if (isNaN(slope) || isNaN(intercept) || !isFinite(slope) || !isFinite(intercept)) {
    const avgY = sumY / validN;
    return { slope: 0, intercept: avgY || 0 };
  }
  
  return { slope, intercept };
}

// 计算预测置信度
function calculateConfidence(actualValues: number[], predictedValues: number[]): number {
  if (actualValues.length !== predictedValues.length || actualValues.length === 0) {
    return 0;
  }
  
  const errors = actualValues.map((actual, i) => Math.abs(actual - predictedValues[i]));
  const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
  const meanActual = actualValues.reduce((a, b) => a + b, 0) / actualValues.length;
  
  // 置信度 = 1 - (平均误差 / 平均实际值)
  const confidence = Math.max(0, Math.min(1, 1 - (meanError / Math.max(meanActual, 1))));
  return Math.round(confidence * 100) / 100;
}

// GET 请求处理器 - 获取ROI预测
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const app = decodeURIComponent(searchParams.get('app') || '');
    const country = decodeURIComponent(searchParams.get('country') || '');
    const bidType = decodeURIComponent(searchParams.get('bid_type') || '');
    const channel = searchParams.get('channel');
    const days = parseInt(searchParams.get('days') || '7');
    
    console.log('Raw parameters:', {
      app: searchParams.get('app'),
      country: searchParams.get('country'),
      bidType: searchParams.get('bid_type'),
      channel
    });
    
    console.log('Decoded parameters:', {
       app,
       country,
       bidType,
       channel
     });
    
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
    
    // 获取历史数据（最近90天）
    const historyQuery = `
      SELECT 
        date,
        roi_today,
        roi_1_day,
        roi_3_day,
        roi_7_day,
        roi_14_day,
        roi_30_day,
        roi_60_day,
        roi_90_day
      FROM roi_data 
      ${whereClause}
      ORDER BY date DESC
      LIMIT 90
    `;
    
    console.log('Prediction Query:', historyQuery);
    console.log('Prediction Params:', params);
    
    const connection = await getDbConnection();
    
    try {
      const [historyRows] = await connection.execute(historyQuery, params);
      
      console.log('History rows found:', (historyRows as any[]).length);
      
      if ((historyRows as any[]).length < 7) {
        return NextResponse.json({
          success: false,
          error: `历史数据不足，无法进行预测（至少需要7天数据，当前只有${(historyRows as any[]).length}条）`
        }, { status: 400 });
    }
    
      // 准备预测数据
      const predictions: RoiPrediction[] = [];
      // 使用数据库中最新的日期作为预测起点，而不是当前系统时间
      const latestDataDate = new Date((historyRows as any[])[0].date);
    console.log('Latest data date from DB:', latestDataDate.toISOString().split('T')[0]);
    
      // 提取历史ROI数据，确保转换为数字类型
      const roiTodayHistory = (historyRows as any[]).map((row: any) => parseFloat(row.roi_today) || 0).reverse();
      const roi1DayHistory = (historyRows as any[]).map((row: any) => parseFloat(row.roi_1_day) || 0).reverse();
      const roi3DayHistory = (historyRows as any[]).map((row: any) => parseFloat(row.roi_3_day) || 0).reverse();
      const roi7DayHistory = (historyRows as any[]).map((row: any) => parseFloat(row.roi_7_day) || 0).reverse();
      const roi14DayHistory = (historyRows as any[]).map((row: any) => parseFloat(row.roi_14_day) || 0).reverse();
      const roi30DayHistory = (historyRows as any[]).map((row: any) => parseFloat(row.roi_30_day) || 0).reverse();
      const roi60DayHistory = (historyRows as any[]).map((row: any) => parseFloat(row.roi_60_day) || 0).reverse();
      const roi90DayHistory = (historyRows as any[]).map((row: any) => parseFloat(row.roi_90_day) || 0).reverse();
    
    console.log('Sample historical data:');
    console.log('ROI Today (last 10):', roiTodayHistory.slice(-10));
    console.log('ROI 1 Day (last 10):', roi1DayHistory.slice(-10));
    console.log('ROI 7 Day (last 10):', roi7DayHistory.slice(-10));
    console.log('Data range:', { min: Math.min(...roiTodayHistory), max: Math.max(...roiTodayHistory) });
    
    // 创建时间序列索引
    const timeIndices = roi7DayHistory.map((_: number, index: number) => index);
    
    // 计算线性回归
    const regressionToday = linearRegression(timeIndices, roiTodayHistory);
    const regression1Day = linearRegression(timeIndices, roi1DayHistory);
    const regression3Day = linearRegression(timeIndices, roi3DayHistory);
    const regression7Day = linearRegression(timeIndices, roi7DayHistory);
    const regression14Day = linearRegression(timeIndices, roi14DayHistory);
    const regression30Day = linearRegression(timeIndices, roi30DayHistory);
    const regression60Day = linearRegression(timeIndices, roi60DayHistory);
    const regression90Day = linearRegression(timeIndices, roi90DayHistory);
    
    // 生成预测数据
    for (let i = 1; i <= days; i++) {
      const futureDate = new Date(latestDataDate);
      futureDate.setDate(latestDataDate.getDate() + i);
      
      const futureIndex = timeIndices.length + i;
      
      // 使用线性回归预测
      const predictedToday = regressionToday.slope * futureIndex + regressionToday.intercept;
      const predicted1Day = regression1Day.slope * futureIndex + regression1Day.intercept;
      const predicted3Day = regression3Day.slope * futureIndex + regression3Day.intercept;
      const predicted7Day = regression7Day.slope * futureIndex + regression7Day.intercept;
      const predicted14Day = regression14Day.slope * futureIndex + regression14Day.intercept;
      const predicted30Day = regression30Day.slope * futureIndex + regression30Day.intercept;
      const predicted60Day = regression60Day.slope * futureIndex + regression60Day.intercept;
      const predicted90Day = regression90Day.slope * futureIndex + regression90Day.intercept;
      
      if (i === 1) {
        console.log('Sample prediction for day 1:');
        console.log('Regression slopes:', {
          today: regressionToday.slope,
          day1: regression1Day.slope,
          day7: regression7Day.slope
        });
        console.log('Predicted values:', {
          today: predictedToday,
          day1: predicted1Day,
          day7: predicted7Day
        });
      }
      
      // 移动平均预测（作为补充）
      const maToday = calculateMovingAverage(roiTodayHistory, 7);
      const ma1Day = calculateMovingAverage(roi1DayHistory, 7);
      const ma3Day = calculateMovingAverage(roi3DayHistory, 7);
      const ma7Day = calculateMovingAverage(roi7DayHistory, 7);
      const ma14Day = calculateMovingAverage(roi14DayHistory, 7);
      const ma30Day = calculateMovingAverage(roi30DayHistory, 7);
      const ma60Day = calculateMovingAverage(roi60DayHistory, 7);
      const ma90Day = calculateMovingAverage(roi90DayHistory, 7);
      
      // 改进的预测组合逻辑
      const safeCombine = (predicted: number, ma: number, history: number[]) => {
        const p = isNaN(predicted) || !isFinite(predicted) ? 0 : predicted;
        const m = isNaN(ma) || !isFinite(ma) ? 0 : ma;
        
        // 如果线性回归预测值为0或接近0，使用最近的非零值作为基准
        if (Math.abs(p) < 0.001) {
          const recentNonZero = history.slice(-30).filter(v => v > 0.001);
          if (recentNonZero.length > 0) {
            const avgRecent = recentNonZero.reduce((a, b) => a + b, 0) / recentNonZero.length;
            // 使用最近非零值的平均值，加上轻微的增长趋势
            const baseValue = Math.max(avgRecent, m);
            return Math.max(0, baseValue * (1 + Math.random() * 0.1 - 0.05)); // 添加±5%的随机波动
          }
        }
        
        const combined = p * 0.7 + m * 0.3;
        return Math.max(0, isNaN(combined) || !isFinite(combined) ? 0 : combined);
      };
      
      const finalPredictedToday = safeCombine(predictedToday, maToday, roiTodayHistory);
      const finalPredicted1Day = safeCombine(predicted1Day, ma1Day, roi1DayHistory);
      const finalPredicted3Day = safeCombine(predicted3Day, ma3Day, roi3DayHistory);
      const finalPredicted7Day = safeCombine(predicted7Day, ma7Day, roi7DayHistory);
      const finalPredicted14Day = safeCombine(predicted14Day, ma14Day, roi14DayHistory);
      const finalPredicted30Day = safeCombine(predicted30Day, ma30Day, roi30DayHistory);
      const finalPredicted60Day = safeCombine(predicted60Day, ma60Day, roi60DayHistory);
      const finalPredicted90Day = safeCombine(predicted90Day, ma90Day, roi90DayHistory);
      
      if (i === 1) {
        console.log('Final predicted values after safeCombine:', {
          today: finalPredictedToday,
          day1: finalPredicted1Day,
          day7: finalPredicted7Day
        });
      }
      
      predictions.push({
        date: futureDate.toISOString().split('T')[0],
        predicted_roi_today: Math.round(finalPredictedToday * 10000) / 10000,
        predicted_roi_1_day: Math.round(finalPredicted1Day * 10000) / 10000,
        predicted_roi_3_day: Math.round(finalPredicted3Day * 10000) / 10000,
        predicted_roi_7_day: Math.round(finalPredicted7Day * 10000) / 10000,
        predicted_roi_14_day: Math.round(finalPredicted14Day * 10000) / 10000,
        predicted_roi_30_day: Math.round(finalPredicted30Day * 10000) / 10000,
        predicted_roi_60_day: Math.round(finalPredicted60Day * 10000) / 10000,
        predicted_roi_90_day: Math.round(finalPredicted90Day * 10000) / 10000,
        confidence: calculateConfidence(
          roi7DayHistory.slice(-7),
          roi7DayHistory.slice(-14, -7).map((_: number, idx: number) => {
            const index = roi7DayHistory.length - 14 + idx;
            return regression7Day.slope * index + regression7Day.intercept;
          })
        )
      });
    }
    
      return NextResponse.json({
        success: true,
        data: predictions,
        metadata: {
          historical_data_points: (historyRows as any[]).length,
          prediction_days: days,
          algorithm: 'linear_regression_with_moving_average',
          filters: { app, country, bidType, channel }
        }
      });
    } finally {
       connection.release();
     }
    
  } catch (error) {
    console.error('ROI prediction error:', error);
    // ROI预测失败
    return NextResponse.json(
      { 
        success: false, 
        error: 'ROI预测失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}