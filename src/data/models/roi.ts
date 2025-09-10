export interface RoiData {
  id?: number;
  date: string;
  app: string;
  bid_type: string;
  country: string;
  channel?: string;
  installs: number;

  roi_today?: number;
  roi_1_day: number;
  roi_3_day: number;
  roi_7_day: number;
  roi_14_day: number;
  roi_30_day: number;
  roi_60_day: number;
  roi_90_day: number;
  is_real_zero?: boolean;
  
  // 精确的日期不足标识字段
  roi_today_is_insufficient_data?: boolean;
  roi_1_day_is_insufficient_data?: boolean;
  roi_3_day_is_insufficient_data?: boolean;
  roi_7_day_is_insufficient_data?: boolean;
  roi_14_day_is_insufficient_data?: boolean;
  roi_30_day_is_insufficient_data?: boolean;
  roi_60_day_is_insufficient_data?: boolean;
  roi_90_day_is_insufficient_data?: boolean;
  
  created_at?: string;
  updated_at?: string;
}

// 预测数据接口
export interface RoiPrediction {
  date: string;
  predicted_roi_today: number;
  predicted_roi_1_day: number;
  predicted_roi_3_day: number;
  predicted_roi_7_day: number;
  predicted_roi_14_day: number;
  predicted_roi_30_day: number;
  predicted_roi_60_day: number;
  predicted_roi_90_day: number;
  confidence: number;
  method?: string;
}

// 趋势分析接口
export interface RoiTrend {
  period: string;
  trend_direction: 'up' | 'down' | 'stable';
  trend_strength: number;
  anomalies: Array<{
    date: string;
    value: number;
    expected: number;
    deviation: number;
  }>;
}