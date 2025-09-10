'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// 移除直接导入roi-service，改为完全通过API调用
import { RoiData, RoiPrediction } from '@/data/models/roi';
import { FC, useEffect, useState, useRef } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ScaleType } from 'recharts/types/util/types';

const RoiChart: FC = () => {
  const [data, setData] = useState<RoiData[]>([]);
  const [predictionData, setPredictionData] = useState<RoiPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState('App-1');
  const [country, setCountry] = useState('美国');
  const [channel, setChannel] = useState<string>('全部');
  const [bidType, setBidType] = useState<string>('CPI');
  const [displayMode, setDisplayMode] = useState('roi_7_day');
  const [yScale, setYScale] = useState<ScaleType>('linear');
  const [showMovingAverage, setShowMovingAverage] = useState(true);
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set());
  const [hiddenRoiTypes, setHiddenRoiTypes] = useState<Set<string>>(new Set([
    'predicted_roi_today',
    'predicted_roi_1_day', 
    'predicted_roi_3_day',
    'predicted_roi_7_day',
    'predicted_roi_14_day',
    'predicted_roi_30_day',
    'predicted_roi_60_day',
    'predicted_roi_90_day'
  ])); // 隐藏的ROI类型集合，预测线默认隐藏
  const [uploadStatus, setUploadStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' | null }>({ message: '', type: null });
  const [filterOptions, setFilterOptions] = useState<{
    channels: string[];
    bidTypes: string[];
    countries: string[];
    apps: string[];
  }>({ channels: [], bidTypes: [], countries: [], apps: [] });

  const formatYAxis = (tickItem: number) => {
    // 处理NaN、null、undefined等无效值
    if (tickItem == null || isNaN(tickItem)) {
      return '0%';
    }
    return `${(tickItem * 100).toFixed(1)}%`;
  };

  const formatXAxis = (tickItem: string) => {
    // 格式化日期显示
    try {
      const date = new Date(tickItem);
      // 返回 MM-DD 格式
      return date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return tickItem;
    }
  };

  // 获取筛选器选项
  const fetchFilterOptions = async () => {
    try {
      const response = await fetch('/api/filter-options', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setFilterOptions({
          channels: ['全部', ...result.channels, 'APPLE'],
          bidTypes: result.bidTypes,
          countries: result.countries,
          apps: result.apps
        });
      } else {
        // 使用默认值
        setFilterOptions({
          channels: ['全部', 'APPLE'],
          bidTypes: ['CPI'],
          countries: ['美国'],
          apps: ['App-1']
        });
      }
    } catch (error) {
      console.error('获取筛选器选项失败:', error);
      // 使用默认值
      setFilterOptions({
        channels: ['全部', 'APPLE'],
        bidTypes: ['CPI'],
        countries: ['美国'],
        apps: ['App-1']
      });
    }
  };

  // 获取数据的函数
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 构建POST请求体
      const requestBody = {
        app,
        country,
        channel: channel === '全部' ? undefined : (channel || 'null'), // 全部时不传递channel参数
        bid_type: bidType,
        // roi_type参数已移除，现在通过前端hiddenRoiTypes控制显示
        limit: 1000
      };
      
      // 移除undefined的属性
      Object.keys(requestBody).forEach(key => {
        if (requestBody[key as keyof typeof requestBody] === undefined) {
          delete requestBody[key as keyof typeof requestBody];
        }
      });
      
      const response = await fetch('/api/roi-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      const result = await response.json();
      
      if (result.success) {
        // 清理数据，确保所有ROI字段都是有效数字
        const cleanedData = result.data.map((item: any) => {
          const roiFields = ['roi_1_day', 'roi_3_day', 'roi_7_day', 'roi_14_day', 'roi_30_day', 'roi_60_day', 'roi_90_day'];
          const cleanedItem = { ...item };
          
          roiFields.forEach(field => {
            const value = cleanedItem[field];
            // 将null、undefined、NaN转换为0
            if (value == null || isNaN(Number(value))) {
              cleanedItem[field] = 0;
            } else {
              cleanedItem[field] = Number(value);
            }
          });
          
          return cleanedItem;
        });
        
        setData(cleanedData);
      } else {
        // 获取ROI数据失败
        console.error('API请求失败:', result.error || '未知错误');
        setData([]);
      }
    } catch (error) {
      // 获取ROI数据失败
      console.error('数据获取失败:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // 获取预测数据的函数
  const fetchPredictionData = async () => {
    try {
      const params = new URLSearchParams({
        app: encodeURIComponent(app),
        country: encodeURIComponent(country),
        bid_type: encodeURIComponent(bidType),
        days: '7'
      });
      
      if (channel && channel !== '全部') {
        params.append('channel', channel);
      }
      
      console.log('正在获取预测数据，参数:', { app, country, bidType, channel });
      const response = await fetch(`/api/roi-prediction?${params}`);
      const result = await response.json();
      
      console.log('预测API响应:', result);
      
      if (result.success) {
        console.log('预测数据获取成功，数据量:', result.data.length);
        setPredictionData(result.data);
      } else {
        console.warn('预测数据获取失败:', result.error);
        setPredictionData([]);
      }
    } catch (error) {
      console.error('获取预测数据失败:', error);
      setPredictionData([]);
    }
  };

  // 先获取筛选器选项，然后获取默认数据
  useEffect(() => {
    const initializeData = async () => {
      // 1. 先获取筛选器选项
      await fetchFilterOptions();
      // 2. 然后获取默认数据
      await fetchData();
      // 3. 获取预测数据
      await fetchPredictionData();
    };
    
    initializeData();
  }, []);
  
  // 当筛选条件改变时，重新获取数据
  useEffect(() => {
    // 只有在筛选器选项已加载后才获取数据
    if (filterOptions.apps.length > 0) {
      fetchData();
      fetchPredictionData();
    }
  }, [app, country, channel, bidType]);
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setUploadStatus({ message: '正在上传...', type: 'info' });
      const response = await fetch('/api/upload-roi', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setUploadStatus({ message: '上传成功！', type: 'success' });
        // 刷新数据
        fetchData();
      } else {
        setUploadStatus({ message: `上传失败: ${result.error}`, type: 'error' });
      }
    } catch (error) {
      setUploadStatus({ message: `上传出错: ${error instanceof Error ? error.message : '未知错误'}`, type: 'error' });
    }
    
    // 清除文件输入，允许再次上传同一文件
    event.target.value = '';
  };
  
  const handleDownloadTemplate = () => {
    // 创建CSV模板内容
    const headers = ['date', 'app', 'bid_type', 'country', 'installs', 'roi_1_day', 'roi_3_day', 'roi_7_day', 'roi_14_day', 'roi_30_day', 'roi_60_day', 'roi_90_day'];
    // 添加示例数据行
    const exampleRow = ['2025-05-01', 'App-1', 'CPI', '美国', '5000', '0.1532', '0.2845', '0.6789', '1.2345', '2.2345', '3.7890', '4.2345'];
    const csvContent = headers.join(',') + '\n' + exampleRow.join(',');
    
    // 创建Blob对象
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 创建下载链接
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'roi_template.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 对数据按日期进行聚合，解决同一日期多个app数据点的问题
  const aggregateDataByDate = (rawData: RoiData[]) => {
    const dateGroups = rawData.reduce((groups, item) => {
      const date = item.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
      return groups;
    }, {} as Record<string, RoiData[]>);

    return Object.entries(dateGroups).map(([date, items]) => {
      // 计算每个ROI字段的平均值
      const roiFields = ['roi_today', 'roi_1_day', 'roi_3_day', 'roi_7_day', 'roi_14_day', 'roi_30_day', 'roi_60_day', 'roi_90_day'] as const;
      const aggregatedItem: RoiData = {
        date,
        app: items.length > 1 ? '多应用平均' : items[0].app,
        country: items[0].country,
        bid_type: items[0].bid_type,
        channel: items[0].channel,
        installs: items.reduce((sum, item) => sum + (item.installs || 0), 0),
        ...Object.fromEntries(
          roiFields.map(field => [
            field,
            items.reduce((sum, item) => sum + (item[field] || 0), 0) / items.length
          ])
        )
      } as RoiData;

      return aggregatedItem;
    });
  };

  // 聚合数据并排序
  const filteredData = aggregateDataByDate(data)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
  // 合并历史数据和预测数据
  const mergeDataWithPredictions = (historicalData: RoiData[], predictions: RoiPrediction[]) => {
    const combinedData = [...historicalData.map(item => ({
      ...item,
      // 为历史数据添加空的预测字段
      predicted_roi_today: null,
      predicted_roi_1_day: null,
      predicted_roi_3_day: null,
      predicted_roi_7_day: null,
      predicted_roi_14_day: null,
      predicted_roi_30_day: null,
      predicted_roi_60_day: null,
      predicted_roi_90_day: null
    }))];
    
    predictions.forEach(prediction => {
      // 安全处理预测值，确保没有NaN
      const safeValue = (val: number) => isNaN(val) || !isFinite(val) ? null : Math.max(0, val);
      
      combinedData.push({
        date: prediction.date,
        app,
        bid_type: bidType,
        country,
        channel,
        installs: 0,
        // 历史数据字段设为null
        roi_today: null,
        roi_1_day: null,
        roi_3_day: null,
        roi_7_day: null,
        roi_14_day: null,
        roi_30_day: null,
        roi_60_day: null,
        roi_90_day: null,
        // 预测数据字段
        predicted_roi_today: safeValue(prediction.predicted_roi_today),
        predicted_roi_1_day: safeValue(prediction.predicted_roi_1_day),
        predicted_roi_3_day: safeValue(prediction.predicted_roi_3_day),
        predicted_roi_7_day: safeValue(prediction.predicted_roi_7_day),
        predicted_roi_14_day: safeValue(prediction.predicted_roi_14_day),
        predicted_roi_30_day: safeValue(prediction.predicted_roi_30_day),
        predicted_roi_60_day: safeValue(prediction.predicted_roi_60_day),
        predicted_roi_90_day: safeValue(prediction.predicted_roi_90_day),
        is_prediction: true // 标记为预测数据
      } as any);
    });
    
    return combinedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };
  
  const dataWithPredictions = mergeDataWithPredictions(filteredData, predictionData);
    
  // 计算7日移动平均
  const calculateMovingAverage = (data: (RoiData & { is_prediction?: boolean })[], windowSize: number = 7) => {
    return data.map((item, index) => {
      // 预测数据不参与移动平均计算
      if (item.is_prediction) {
        return item;
      }
      
      const start = Math.max(0, index - windowSize + 1);
      const window = data.slice(start, index + 1).filter(d => !d.is_prediction);
      
      const avgData = { ...item };
      
      // 计算各个ROI字段的移动平均
      const roiFields = ['roi_today', 'roi_1_day', 'roi_3_day', 'roi_7_day', 'roi_14_day', 'roi_30_day', 'roi_60_day', 'roi_90_day'] as const;
      
      roiFields.forEach(field => {
        const validValues = window
          .map(curr => curr[field] || 0)
          .filter(val => !isNaN(val) && isFinite(val));
        
        if (validValues.length > 0) {
          const sum = validValues.reduce((acc, val) => acc + val, 0);
          const avg = sum / validValues.length;
          avgData[field] = isNaN(avg) || !isFinite(avg) ? 0 : avg;
        } else {
          avgData[field] = 0;
        }
      });
      
      return avgData;
    });
  };
  
  // 使用移动平均或原始数据
  let processedData = showMovingAverage ? calculateMovingAverage(dataWithPredictions) : dataWithPredictions;
  
  // 对数刻度模式下，将0值替换为很小的正数
  if (yScale === 'log') {
    processedData = processedData.map(item => {
      const newItem = { ...item };
      const roiFields = ['roi_today', 'roi_1_day', 'roi_3_day', 'roi_7_day', 'roi_14_day', 'roi_30_day', 'roi_60_day', 'roi_90_day'] as const;
      
      roiFields.forEach(field => {
        if ((newItem[field] || 0) <= 0) {
          newItem[field] = 0.0001; // 替换为很小的正数
        }
      });
      
      return newItem;
    });
  }
  
  // 分离历史数据和预测数据
  const historicalData = processedData.filter(item => !(item as any).is_prediction);
  const predictionOnlyData = processedData.filter(item => (item as any).is_prediction);

  const apps = Array.from(new Set(data.map((d) => d.app)));
  const countries = Array.from(new Set(data.map((d) => d.country)));

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{app} - 多时间维度ROI趋势</CardTitle>
            <CardDescription>
              {showMovingAverage ? '(7日移动平均)' : '(原始数据)'}
              <br />
              数据范围: 最近90天
            </CardDescription>
            {uploadStatus.message && (
              <div className={`mt-2 text-sm ${uploadStatus.type === 'success' ? 'text-green-500' : uploadStatus.type === 'error' ? 'text-red-500' : 'text-blue-500'}`}>
                {uploadStatus.message}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".csv"
              id="csvFileInput"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('csvFileInput')?.click()}
            >
              导入CSV
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
            >
              下载模板
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 筛选器标题 */}
        <div className="grid grid-cols-4 gap-4 px-4 pt-4 pb-2">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">用户安装渠道</div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">出价类型</div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">国家地区</div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">APP</div>
        </div>
        {/* 筛选器 */}
        <div className="grid grid-cols-4 gap-4 px-4 pb-4">
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger>
              <SelectValue placeholder="用户安装渠道" />
            </SelectTrigger>
            <SelectContent className="z-50" position="popper" sideOffset={4}>
              {filterOptions.channels.map((channelOption) => (
                <SelectItem key={channelOption} value={channelOption}>
                  {channelOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={bidType} onValueChange={setBidType}>
            <SelectTrigger>
              <SelectValue placeholder="出价类型" />
            </SelectTrigger>
            <SelectContent className="z-50" position="popper" sideOffset={4}>
              {filterOptions.bidTypes.map((bidTypeOption) => (
                <SelectItem key={bidTypeOption} value={bidTypeOption}>
                  {bidTypeOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger>
              <SelectValue placeholder="国家地区" />
            </SelectTrigger>
            <SelectContent className="z-50" position="popper" sideOffset={4}>
              {filterOptions.countries.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={app} onValueChange={setApp}>
            <SelectTrigger>
              <SelectValue placeholder="APP" />
            </SelectTrigger>
            <SelectContent className="z-50" position="popper" sideOffset={4}>
              {filterOptions.apps.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4 p-4">
          <div>
            <Label className="block mb-2">数据显示模式</Label>
            <RadioGroup
              defaultValue={showMovingAverage ? 'moving_average' : 'original'}
              onValueChange={(value) => setShowMovingAverage(value === 'moving_average')}
              className="flex items-center space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="moving_average" id="moving_average" />
                <Label htmlFor="moving_average">显示移动平均值</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="original" id="original" />
                <Label htmlFor="original">显示原始数据</Label>
              </div>
            </RadioGroup>
          </div>
          <div>
            <Label className="block mb-2">Y轴刻度</Label>
            <RadioGroup
              defaultValue={yScale}
              onValueChange={(value) => setYScale(value as ScaleType)}
              className="flex items-center space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="linear" id="linear" />
                <Label htmlFor="linear">线性刻度</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="log" id="log" />
                <Label htmlFor="log">对数刻度</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        <div style={{ width: '100%', height: 500, overflowX: 'auto' }}>
          <div style={{ minWidth: Math.max(800, historicalData.length * 50), height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatXAxis}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                scale={yScale}
                domain={yScale === 'log' ? [0.001, 'dataMax'] : ['dataMin', 'dataMax']}
                tickFormatter={formatYAxis}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    // 格式化tooltip中的日期显示
                    const formatTooltipDate = (dateStr: string) => {
                      try {
                        const date = new Date(dateStr);
                        return date.toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          weekday: 'short'
                        });
                      } catch (error) {
                        return dateStr;
                      }
                    };
                    
                    return (
                      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
                        <p className="font-semibold">{`日期: ${formatTooltipDate(label as string)}`}</p>
                        {payload.map((entry, index) => {
                          const value = entry.value as number;
                          const fieldName = entry.dataKey as string;
                          let tooltip = `${entry.name}: ${(value * 100).toFixed(2)}%`;
                          
                          // 如果是0%，显示具体原因
                          if (value === 0) {
                            const insufficientDataField = `${fieldName}_is_insufficient_data`;
                            if (data[insufficientDataField] === true) {
                              tooltip += ' (数据不足0% - 统计周期不够)';
                            } else if (data[insufficientDataField] === false) {
                              tooltip += ' (真实0% - 无收益)';
                            } else {
                              // 兼容旧数据格式
                              if (data.is_real_zero) {
                                tooltip += ' (真实0% - 无收益)';
                              } else {
                                tooltip += ' (数据不足0% - 统计周期不够)';
                              }
                            }
                          }
                          
                          return (
                            <p key={index} style={{ color: entry.color }}>
                              {tooltip}
                            </p>
                          );
                        })}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <ReferenceLine y={1} stroke="red" label="100%回本线" />

              <Line
                type="monotone"
                dataKey="roi_today"
                stroke="#8884d8"
                name={showMovingAverage ? '当日(7日均值)' : '当日ROI'}
                hide={hiddenRoiTypes.has('roi_today')}
              />
              <Line
                type="monotone"
                dataKey="roi_1_day"
                stroke="#82ca9d"
                name={showMovingAverage ? '1日(7日均值)' : '1日ROI'}
                hide={hiddenRoiTypes.has('roi_1_day')}
              />
              <Line
                type="monotone"
                dataKey="roi_3_day"
                stroke="#ffc658"
                name={showMovingAverage ? '3日(7日均值)' : '3日ROI'}
                hide={hiddenRoiTypes.has('roi_3_day')}
              />
              <Line
                type="monotone"
                dataKey="roi_7_day"
                stroke="#ff8042"
                name={showMovingAverage ? '7日(7日均值)' : '7日ROI'}
                hide={hiddenRoiTypes.has('roi_7_day')}
              />
              <Line
                type="monotone"
                dataKey="roi_14_day"
                stroke="#0088fe"
                name={showMovingAverage ? '14日(7日均值)' : '14日ROI'}
                hide={hiddenRoiTypes.has('roi_14_day')}
              />
              <Line
                type="monotone"
                dataKey="roi_30_day"
                stroke="#00c49f"
                name={showMovingAverage ? '30日(7日均值)' : '30日ROI'}
                hide={hiddenRoiTypes.has('roi_30_day')}
              />
              <Line
                type="monotone"
                dataKey="roi_60_day"
                stroke="#ffbb28"
                name={showMovingAverage ? '60日(7日均值)' : '60日ROI'}
                hide={hiddenRoiTypes.has('roi_60_day')}
              />
              <Line
                type="monotone"
                dataKey="roi_90_day"
                stroke="#ff5722"
                name={showMovingAverage ? '90日(7日均值)' : '90日ROI'}
                hide={hiddenRoiTypes.has('roi_90_day')}
              />
              
              {/* 预测线 - 虚线样式 */}
              <Line
                type="monotone"
                dataKey="predicted_roi_today"
                stroke="#8884d8"
                strokeDasharray="5 5"
                name="当日ROI预测"
                hide={hiddenRoiTypes.has('predicted_roi_today')}
                opacity={0.7}
              />
              <Line
                type="monotone"
                dataKey="predicted_roi_1_day"
                stroke="#82ca9d"
                strokeDasharray="5 5"
                name="1日ROI预测"
                hide={hiddenRoiTypes.has('predicted_roi_1_day')}
                opacity={0.7}
              />
              <Line
                type="monotone"
                dataKey="predicted_roi_3_day"
                stroke="#ffc658"
                strokeDasharray="5 5"
                name="3日ROI预测"
                hide={hiddenRoiTypes.has('predicted_roi_3_day')}
                opacity={0.7}
              />
              <Line
                type="monotone"
                dataKey="predicted_roi_7_day"
                stroke="#ff8042"
                strokeDasharray="5 5"
                name="7日ROI预测"
                hide={hiddenRoiTypes.has('predicted_roi_7_day')}
                opacity={0.7}
              />
              <Line
                type="monotone"
                dataKey="predicted_roi_14_day"
                stroke="#0088fe"
                strokeDasharray="5 5"
                name="14日ROI预测"
                hide={hiddenRoiTypes.has('predicted_roi_14_day')}
                opacity={0.7}
              />
              <Line
                type="monotone"
                dataKey="predicted_roi_30_day"
                stroke="#00c49f"
                strokeDasharray="5 5"
                name="30日ROI预测"
                hide={hiddenRoiTypes.has('predicted_roi_30_day')}
                opacity={0.7}
              />
              <Line
                type="monotone"
                dataKey="predicted_roi_60_day"
                stroke="#ffbb28"
                strokeDasharray="5 5"
                name="60日ROI预测"
                hide={hiddenRoiTypes.has('predicted_roi_60_day')}
                opacity={0.7}
              />
              <Line
                type="monotone"
                dataKey="predicted_roi_90_day"
                stroke="#ff5722"
                strokeDasharray="5 5"
                name="90日ROI预测"
                hide={hiddenRoiTypes.has('predicted_roi_90_day')}
                opacity={0.7}
              />

              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* 独立图例区域 */}
        <div className="mt-4 p-4 border-t">
          <div className="mb-3">
            <div 
              className={`inline-flex items-center gap-1 cursor-pointer px-3 py-1 rounded ${hiddenRoiTypes.size === 0 ? 'bg-blue-100 font-bold' : 'opacity-70 hover:opacity-100'}`}
              onClick={() => {
                setHiddenRoiTypes(new Set());
                fetchData();
              }}
            >
              <span className="text-sm">显示全部</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div 
              className={`flex items-center gap-1 cursor-pointer ${!hiddenRoiTypes.has('roi_today') ? 'font-bold' : 'opacity-70'}`}
              onClick={() => {
                const newHiddenTypes = new Set(hiddenRoiTypes);
                if (hiddenRoiTypes.has('roi_today')) {
                  newHiddenTypes.delete('roi_today');
                } else {
                  newHiddenTypes.add('roi_today');
                }
                setHiddenRoiTypes(newHiddenTypes);
                fetchData();
              }}
            >
              <div className="w-4 h-0.5 bg-[#8884d8]"></div>
              <span className="text-sm">{showMovingAverage ? '当日(7日均值)' : '当日ROI'}</span>
            </div>
            <div 
              className={`flex items-center gap-1 cursor-pointer ${!hiddenRoiTypes.has('roi_1_day') ? 'font-bold' : 'opacity-70'}`}
              onClick={() => {
                const newHiddenTypes = new Set(hiddenRoiTypes);
                if (hiddenRoiTypes.has('roi_1_day')) {
                  newHiddenTypes.delete('roi_1_day');
                } else {
                  newHiddenTypes.add('roi_1_day');
                }
                setHiddenRoiTypes(newHiddenTypes);
                fetchData();
              }}
            >
              <div className="w-4 h-0.5 bg-[#82ca9d]"></div>
              <span className="text-sm">{showMovingAverage ? '1日(7日均值)' : '1日ROI'}</span>
            </div>
            <div 
              className={`flex items-center gap-1 cursor-pointer ${!hiddenRoiTypes.has('roi_3_day') ? 'font-bold' : 'opacity-70'}`}
              onClick={() => {
                const newHiddenTypes = new Set(hiddenRoiTypes);
                if (hiddenRoiTypes.has('roi_3_day')) {
                  newHiddenTypes.delete('roi_3_day');
                } else {
                  newHiddenTypes.add('roi_3_day');
                }
                setHiddenRoiTypes(newHiddenTypes);
                fetchData();
              }}
            >
              <div className="w-4 h-0.5 bg-[#ffc658]"></div>
              <span className="text-sm">{showMovingAverage ? '3日(7日均值)' : '3日ROI'}</span>
            </div>
            <div 
              className={`flex items-center gap-1 cursor-pointer ${!hiddenRoiTypes.has('roi_7_day') ? 'font-bold' : 'opacity-70'}`}
              onClick={() => {
                const newHiddenTypes = new Set(hiddenRoiTypes);
                if (hiddenRoiTypes.has('roi_7_day')) {
                  newHiddenTypes.delete('roi_7_day');
                } else {
                  newHiddenTypes.add('roi_7_day');
                }
                setHiddenRoiTypes(newHiddenTypes);
                fetchData();
              }}
            >
              <div className="w-4 h-0.5 bg-[#ff8042]"></div>
              <span className="text-sm">{showMovingAverage ? '7日(7日均值)' : '7日ROI'}</span>
            </div>
            <div 
              className={`flex items-center gap-1 cursor-pointer ${!hiddenRoiTypes.has('roi_14_day') ? 'font-bold' : 'opacity-70'}`}
              onClick={() => {
                const newHiddenTypes = new Set(hiddenRoiTypes);
                if (hiddenRoiTypes.has('roi_14_day')) {
                  newHiddenTypes.delete('roi_14_day');
                } else {
                  newHiddenTypes.add('roi_14_day');
                }
                setHiddenRoiTypes(newHiddenTypes);
                fetchData();
              }}
            >
              <div className="w-4 h-0.5 bg-[#0088fe]"></div>
              <span className="text-sm">{showMovingAverage ? '14日(7日均值)' : '14日ROI'}</span>
            </div>
            <div 
              className={`flex items-center gap-1 cursor-pointer ${!hiddenRoiTypes.has('roi_30_day') ? 'font-bold' : 'opacity-70'}`}
              onClick={() => {
                const newHiddenTypes = new Set(hiddenRoiTypes);
                if (hiddenRoiTypes.has('roi_30_day')) {
                  newHiddenTypes.delete('roi_30_day');
                } else {
                  newHiddenTypes.add('roi_30_day');
                }
                setHiddenRoiTypes(newHiddenTypes);
                fetchData();
              }}
            >
              <div className="w-4 h-0.5 bg-[#00c49f]"></div>
              <span className="text-sm">{showMovingAverage ? '30日(7日均值)' : '30日ROI'}</span>
            </div>
            <div 
              className={`flex items-center gap-1 cursor-pointer ${!hiddenRoiTypes.has('roi_60_day') ? 'font-bold' : 'opacity-70'}`}
              onClick={() => {
                const newHiddenTypes = new Set(hiddenRoiTypes);
                if (hiddenRoiTypes.has('roi_60_day')) {
                  newHiddenTypes.delete('roi_60_day');
                } else {
                  newHiddenTypes.add('roi_60_day');
                }
                setHiddenRoiTypes(newHiddenTypes);
                fetchData();
              }}
            >
              <div className="w-4 h-0.5 bg-[#ffbb28]"></div>
              <span className="text-sm">{showMovingAverage ? '60日(7日均值)' : '60日ROI'}</span>
            </div>
            <div 
              className={`flex items-center gap-1 cursor-pointer ${!hiddenRoiTypes.has('roi_90_day') ? 'font-bold' : 'opacity-70'}`}
              onClick={() => {
                const newHiddenTypes = new Set(hiddenRoiTypes);
                if (hiddenRoiTypes.has('roi_90_day')) {
                  newHiddenTypes.delete('roi_90_day');
                } else {
                  newHiddenTypes.add('roi_90_day');
                }
                setHiddenRoiTypes(newHiddenTypes);
                fetchData();
              }}
            >
              <div className="w-4 h-0.5 bg-[#ff5722]"></div>
              <span className="text-sm">{showMovingAverage ? '90日(7日均值)' : '90日ROI'}</span>
            </div>
          </div>
          
          {/* 预测线图例区域 */}
          <div className="mt-4 pt-4 border-t">
            <div className="mb-2">
              <span className="text-sm font-semibold text-gray-600">预测线 (虚线)</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div 
                className={`flex items-center gap-1 cursor-pointer ${!hiddenRoiTypes.has('predicted_roi_today') ? 'font-bold' : 'opacity-70'}`}
                onClick={() => {
                  const newHiddenTypes = new Set(hiddenRoiTypes);
                  if (hiddenRoiTypes.has('predicted_roi_today')) {
                    newHiddenTypes.delete('predicted_roi_today');
                  } else {
                    newHiddenTypes.add('predicted_roi_today');
                  }
                  setHiddenRoiTypes(newHiddenTypes);
                  fetchData();
                }}
              >
                <div className="w-4 h-0.5 bg-[#8884d8] opacity-70" style={{backgroundImage: 'repeating-linear-gradient(to right, #8884d8 0, #8884d8 3px, transparent 3px, transparent 6px)'}}></div>
                <span className="text-sm">当日ROI预测</span>
              </div>
              <div 
                className={`flex items-center gap-1 cursor-pointer ${!hiddenRoiTypes.has('predicted_roi_1_day') ? 'font-bold' : 'opacity-70'}`}
                onClick={() => {
                  const newHiddenTypes = new Set(hiddenRoiTypes);
                  if (hiddenRoiTypes.has('predicted_roi_1_day')) {
                    newHiddenTypes.delete('predicted_roi_1_day');
                  } else {
                    newHiddenTypes.add('predicted_roi_1_day');
                  }
                  setHiddenRoiTypes(newHiddenTypes);
                  fetchData();
                }}
              >
                <div className="w-4 h-0.5 bg-[#82ca9d] opacity-70" style={{backgroundImage: 'repeating-linear-gradient(to right, #82ca9d 0, #82ca9d 3px, transparent 3px, transparent 6px)'}}></div>
                <span className="text-sm">1日ROI预测</span>
              </div>
              <div 
                className={`flex items-center gap-1 cursor-pointer ${!hiddenRoiTypes.has('predicted_roi_3_day') ? 'font-bold' : 'opacity-70'}`}
                onClick={() => {
                  const newHiddenTypes = new Set(hiddenRoiTypes);
                  if (hiddenRoiTypes.has('predicted_roi_3_day')) {
                    newHiddenTypes.delete('predicted_roi_3_day');
                  } else {
                    newHiddenTypes.add('predicted_roi_3_day');
                  }
                  setHiddenRoiTypes(newHiddenTypes);
                  fetchData();
                }}
              >
                <div className="w-4 h-0.5 bg-[#ffc658] opacity-70" style={{backgroundImage: 'repeating-linear-gradient(to right, #ffc658 0, #ffc658 3px, transparent 3px, transparent 6px)'}}></div>
                <span className="text-sm">3日ROI预测</span>
              </div>
              <div 
                className={`flex items-center gap-1 cursor-pointer ${!hiddenRoiTypes.has('predicted_roi_7_day') ? 'font-bold' : 'opacity-70'}`}
                onClick={() => {
                  const newHiddenTypes = new Set(hiddenRoiTypes);
                  if (hiddenRoiTypes.has('predicted_roi_7_day')) {
                    newHiddenTypes.delete('predicted_roi_7_day');
                  } else {
                    newHiddenTypes.add('predicted_roi_7_day');
                  }
                  setHiddenRoiTypes(newHiddenTypes);
                  fetchData();
                }}
              >
                <div className="w-4 h-0.5 bg-[#ff8042] opacity-70" style={{backgroundImage: 'repeating-linear-gradient(to right, #ff8042 0, #ff8042 3px, transparent 3px, transparent 6px)'}}></div>
                <span className="text-sm">7日ROI预测</span>
              </div>
              <div 
                className={`flex items-center gap-1 cursor-pointer ${!hiddenRoiTypes.has('predicted_roi_14_day') ? 'font-bold' : 'opacity-70'}`}
                onClick={() => {
                  const newHiddenTypes = new Set(hiddenRoiTypes);
                  if (hiddenRoiTypes.has('predicted_roi_14_day')) {
                    newHiddenTypes.delete('predicted_roi_14_day');
                  } else {
                    newHiddenTypes.add('predicted_roi_14_day');
                  }
                  setHiddenRoiTypes(newHiddenTypes);
                  fetchData();
                }}
              >
                <div className="w-4 h-0.5 bg-[#0088fe] opacity-70" style={{backgroundImage: 'repeating-linear-gradient(to right, #0088fe 0, #0088fe 3px, transparent 3px, transparent 6px)'}}></div>
                <span className="text-sm">14日ROI预测</span>
              </div>
              <div 
                className={`flex items-center gap-1 cursor-pointer ${!hiddenRoiTypes.has('predicted_roi_30_day') ? 'font-bold' : 'opacity-70'}`}
                onClick={() => {
                  const newHiddenTypes = new Set(hiddenRoiTypes);
                  if (hiddenRoiTypes.has('predicted_roi_30_day')) {
                    newHiddenTypes.delete('predicted_roi_30_day');
                  } else {
                    newHiddenTypes.add('predicted_roi_30_day');
                  }
                  setHiddenRoiTypes(newHiddenTypes);
                  fetchData();
                }}
              >
                <div className="w-4 h-0.5 bg-[#00c49f] opacity-70" style={{backgroundImage: 'repeating-linear-gradient(to right, #00c49f 0, #00c49f 3px, transparent 3px, transparent 6px)'}}></div>
                <span className="text-sm">30日ROI预测</span>
              </div>
              <div 
                className={`flex items-center gap-1 cursor-pointer ${!hiddenRoiTypes.has('predicted_roi_60_day') ? 'font-bold' : 'opacity-70'}`}
                onClick={() => {
                  const newHiddenTypes = new Set(hiddenRoiTypes);
                  if (hiddenRoiTypes.has('predicted_roi_60_day')) {
                    newHiddenTypes.delete('predicted_roi_60_day');
                  } else {
                    newHiddenTypes.add('predicted_roi_60_day');
                  }
                  setHiddenRoiTypes(newHiddenTypes);
                  fetchData();
                }}
              >
                <div className="w-4 h-0.5 bg-[#ffbb28] opacity-70" style={{backgroundImage: 'repeating-linear-gradient(to right, #ffbb28 0, #ffbb28 3px, transparent 3px, transparent 6px)'}}></div>
                <span className="text-sm">60日ROI预测</span>
              </div>
              <div 
                className={`flex items-center gap-1 cursor-pointer ${!hiddenRoiTypes.has('predicted_roi_90_day') ? 'font-bold' : 'opacity-70'}`}
                onClick={() => {
                  const newHiddenTypes = new Set(hiddenRoiTypes);
                  if (hiddenRoiTypes.has('predicted_roi_90_day')) {
                    newHiddenTypes.delete('predicted_roi_90_day');
                  } else {
                    newHiddenTypes.add('predicted_roi_90_day');
                  }
                  setHiddenRoiTypes(newHiddenTypes);
                  fetchData();
                }}
              >
                <div className="w-4 h-0.5 bg-[#ff5722] opacity-70" style={{backgroundImage: 'repeating-linear-gradient(to right, #ff5722 0, #ff5722 3px, transparent 3px, transparent 6px)'}}></div>
                <span className="text-sm">90日ROI预测</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RoiChart;