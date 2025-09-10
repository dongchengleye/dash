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
  const [channel, setChannel] = useState('全部');
  const [bidType, setBidType] = useState('CPI');
  const [country, setCountry] = useState('美国');
  const [app, setApp] = useState('App-1');
  const [displayMode, setDisplayMode] = useState('percentage'); // 'percentage' | 'decimal'
  const [yScale, setYScale] = useState<ScaleType>('linear'); // 'linear' | 'log'
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 筛选器选项状态
  const [filterOptions, setFilterOptions] = useState({
    channels: ['全部'],
    bidTypes: ['CPI'],
    countries: ['美国'],
    apps: ['App-1']
  });

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

  // 获取数据
  const fetchData = async () => {
    setLoading(true);
    try {
      // 构建查询参数
      const params = new URLSearchParams();
      if (channel && channel !== '全部') params.append('channel', channel);
      if (bidType) params.append('bidType', bidType);
      if (country) params.append('country', country);
      if (app) params.append('app', app);
      
      const response = await fetch(`/api/roi-data?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // 数据清洗：确保所有ROI字段都是数字
        const cleanedData = result.data.map((item: any) => {
          const cleanedItem = { ...item };
          
          // ROI字段列表
          const roiFields = ['roi_today', 'roi_1_day', 'roi_3_day', 'roi_7_day', 'roi_14_day', 'roi_30_day', 'roi_60_day', 'roi_90_day'];
          
          roiFields.forEach(field => {
            const value = cleanedItem[field];
            if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
              cleanedItem[field] = 0;
            } else {
              cleanedItem[field] = Number(value);
            }
          });
          
          return cleanedItem;
        });
        setData(cleanedData);
      } else {
          // API请求失败
          console.error('API请求失败:', result.error || '未知错误');
          setData([]);
        }
      } catch (error) {
        console.error('Data fetch failed:', error);
      } finally {
        setLoading(false);
      }
    };

  // 获取预测数据
  const fetchPredictionData = async () => {
    try {
      // 构建查询参数
      const params = new URLSearchParams();
      if (channel && channel !== '全部') params.append('channel', channel);
      if (bidType) params.append('bidType', bidType);
      if (country) params.append('country', country);
      if (app) params.append('app', app);
      
      const response = await fetch(`/api/roi-prediction?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // 数据清洗：确保所有ROI字段都是数字，并过滤掉NaN值
        const cleanedData = result.data.map((item: any) => {
          const cleanedItem = { ...item };
          
          // ROI字段列表
          const roiFields = ['roi_today_prediction', 'roi_1_day_prediction', 'roi_3_day_prediction', 'roi_7_day_prediction', 'roi_14_day_prediction', 'roi_30_day_prediction', 'roi_60_day_prediction', 'roi_90_day_prediction'];
          
          roiFields.forEach(field => {
            const value = cleanedItem[field];
            if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
              cleanedItem[field] = null; // 预测数据中的无效值设为null，这样图表会跳过这些点
            } else {
              const numValue = Number(value);
              // 检查是否为NaN
              if (isNaN(numValue)) {
                cleanedItem[field] = null;
              } else {
                cleanedItem[field] = numValue;
              }
            }
          });
          
          return cleanedItem;
        }).filter((item: any) => {
          // 过滤掉所有预测字段都为null的数据项
          const roiFields = ['roi_today_prediction', 'roi_1_day_prediction', 'roi_3_day_prediction', 'roi_7_day_prediction', 'roi_14_day_prediction', 'roi_30_day_prediction', 'roi_60_day_prediction', 'roi_90_day_prediction'];
          return roiFields.some(field => item[field] !== null && item[field] !== undefined);
        });
        
        setPredictionData(cleanedData);
      } else {
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

  // 格式化数字显示
  const formatNumber = (value: number) => {
    if (displayMode === 'percentage') {
      return `${(value * 100).toFixed(2)}%`;
    }
    return value.toFixed(4);
  };

  // 格式化Y轴
  const formatYAxis = (value: number) => {
    if (displayMode === 'percentage') {
      return `${(value * 100).toFixed(0)}%`;
    }
    return value.toFixed(2);
  };

  // 格式化X轴日期
  const formatXAxis = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 处理CSV文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-csv', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`成功导入 ${result.count} 条数据`);
        // 重新获取数据
        await fetchData();
      } else {
        alert(`导入失败: ${result.error}`);
      }
    } catch (error) {
      console.error('文件上传失败:', error);
      alert('文件上传失败');
    }

    // 清空文件输入
    if (event.target) {
      event.target.value = '';
    }
  };

  // 下载CSV模板
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

  // 合并历史数据和预测数据
  const historicalData = data.map(item => ({ ...item }));
  const predictionOnlyData = predictionData.filter(predItem => 
    !historicalData.some(histItem => histItem.date === predItem.date)
  );
  
  // 将预测数据合并到历史数据中（用于显示连续的图表）
  const combinedData = [...historicalData, ...predictionOnlyData].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ROI 趋势分析</CardTitle>
          <CardDescription>数据范围: 所有可用数据</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">加载中...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ROI 趋势分析</CardTitle>
        <CardDescription>数据范围: 所有可用数据</CardDescription>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
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
        <div className="grid grid-cols-4 gap-4 p-4">
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
            <RadioGroup value={displayMode} onValueChange={setDisplayMode}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="percentage" />
                <Label htmlFor="percentage">百分比 (%)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="decimal" id="decimal" />
                <Label htmlFor="decimal">小数</Label>
              </div>
            </RadioGroup>
          </div>
          <div>
            <Label className="block mb-2">Y轴刻度</Label>
            <RadioGroup value={yScale} onValueChange={(value: string) => setYScale(value as ScaleType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="linear" id="linear" />
                <Label htmlFor="linear">线性</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="log" id="log" />
                <Label htmlFor="log">对数</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        
        {/* 图例区域 - 固定在顶部 */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-4 justify-center">
            {/* 历史数据图例 */}
            <div 
              className={`flex items-center gap-1 cursor-pointer ${hiddenLines.has('roi_today') ? 'opacity-50' : ''}`}
              onClick={() => {
                setHiddenLines(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has('roi_today')) {
                    newSet.delete('roi_today');
                  } else {
                    newSet.add('roi_today');
                  }
                  return newSet;
                });
              }}
            >
              <div className="w-4 h-0.5 bg-red-500"></div>
              <span className="text-sm">当日ROI</span>
            </div>
            <div 
              className={`flex items-center gap-1 cursor-pointer ${hiddenLines.has('roi_1_day') ? 'opacity-50' : ''}`}
              onClick={() => {
                setHiddenLines(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has('roi_1_day')) {
                    newSet.delete('roi_1_day');
                  } else {
                    newSet.add('roi_1_day');
                  }
                  return newSet;
                });
              }}
            >
              <div className="w-4 h-0.5 bg-blue-500"></div>
              <span className="text-sm">1日ROI</span>
            </div>
            <div 
              className={`flex items-center gap-1 cursor-pointer ${hiddenLines.has('roi_3_day') ? 'opacity-50' : ''}`}
              onClick={() => {
                setHiddenLines(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has('roi_3_day')) {
                    newSet.delete('roi_3_day');
                  } else {
                    newSet.add('roi_3_day');
                  }
                  return newSet;
                });
              }}
            >
              <div className="w-4 h-0.5 bg-green-500"></div>
              <span className="text-sm">3日ROI</span>
            </div>
            <div 
              className={`flex items-center gap-1 cursor-pointer ${hiddenLines.has('roi_7_day') ? 'opacity-50' : ''}`}
              onClick={() => {
                setHiddenLines(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has('roi_7_day')) {
                    newSet.delete('roi_7_day');
                  } else {
                    newSet.add('roi_7_day');
                  }
                  return newSet;
                });
              }}
            >
              <div className="w-4 h-0.5 bg-yellow-500"></div>
              <span className="text-sm">7日ROI</span>
            </div>
            <div 
              className={`flex items-center gap-1 cursor-pointer ${hiddenLines.has('roi_14_day') ? 'opacity-50' : ''}`}
              onClick={() => {
                setHiddenLines(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has('roi_14_day')) {
                    newSet.delete('roi_14_day');
                  } else {
                    newSet.add('roi_14_day');
                  }
                  return newSet;
                });
              }}
            >
              <div className="w-4 h-0.5 bg-purple-500"></div>
              <span className="text-sm">14日ROI</span>
            </div>
            <div 
              className={`flex items-center gap-1 cursor-pointer ${hiddenLines.has('roi_30_day') ? 'opacity-50' : ''}`}
              onClick={() => {
                setHiddenLines(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has('roi_30_day')) {
                    newSet.delete('roi_30_day');
                  } else {
                    newSet.add('roi_30_day');
                  }
                  return newSet;
                });
              }}
            >
              <div className="w-4 h-0.5 bg-cyan-500"></div>
              <span className="text-sm">30日ROI</span>
            </div>
            <div 
              className={`flex items-center gap-1 cursor-pointer ${hiddenLines.has('roi_60_day') ? 'opacity-50' : ''}`}
              onClick={() => {
                setHiddenLines(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has('roi_60_day')) {
                    newSet.delete('roi_60_day');
                  } else {
                    newSet.add('roi_60_day');
                  }
                  return newSet;
                });
              }}
            >
              <div className="w-4 h-0.5 bg-orange-500"></div>
              <span className="text-sm">60日ROI</span>
            </div>
            <div 
              className={`flex items-center gap-1 cursor-pointer ${hiddenLines.has('roi_90_day') ? 'opacity-50' : ''}`}
              onClick={() => {
                setHiddenLines(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has('roi_90_day')) {
                    newSet.delete('roi_90_day');
                  } else {
                    newSet.add('roi_90_day');
                  }
                  return newSet;
                });
              }}
            >
              <div className="w-4 h-0.5 bg-pink-500"></div>
              <span className="text-sm">90日ROI</span>
            </div>
            {/* 预测数据图例 */}
            {predictionOnlyData.length > 0 && (
              <>
                <div 
                  className={`flex items-center gap-1 cursor-pointer ${hiddenLines.has('roi_today_prediction') ? 'opacity-50' : ''}`}
                  onClick={() => {
                    setHiddenLines(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has('roi_today_prediction')) {
                        newSet.delete('roi_today_prediction');
                      } else {
                        newSet.add('roi_today_prediction');
                      }
                      return newSet;
                    });
                  }}
                >
                  <div className="w-4 h-0.5 bg-red-500" style={{borderTop: '2px dashed'}}></div>
                  <span className="text-sm">当日ROI预测</span>
                </div>
                <div 
                  className={`flex items-center gap-1 cursor-pointer ${hiddenLines.has('roi_1_day_prediction') ? 'opacity-50' : ''}`}
                  onClick={() => {
                    setHiddenLines(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has('roi_1_day_prediction')) {
                        newSet.delete('roi_1_day_prediction');
                      } else {
                        newSet.add('roi_1_day_prediction');
                      }
                      return newSet;
                    });
                  }}
                >
                  <div className="w-4 h-0.5 bg-blue-500" style={{borderTop: '2px dashed'}}></div>
                  <span className="text-sm">1日ROI预测</span>
                </div>
                <div 
                  className={`flex items-center gap-1 cursor-pointer ${hiddenLines.has('roi_3_day_prediction') ? 'opacity-50' : ''}`}
                  onClick={() => {
                    setHiddenLines(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has('roi_3_day_prediction')) {
                        newSet.delete('roi_3_day_prediction');
                      } else {
                        newSet.add('roi_3_day_prediction');
                      }
                      return newSet;
                    });
                  }}
                >
                  <div className="w-4 h-0.5 bg-green-500" style={{borderTop: '2px dashed'}}></div>
                  <span className="text-sm">3日ROI预测</span>
                </div>
                <div 
                  className={`flex items-center gap-1 cursor-pointer ${hiddenLines.has('roi_7_day_prediction') ? 'opacity-50' : ''}`}
                  onClick={() => {
                    setHiddenLines(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has('roi_7_day_prediction')) {
                        newSet.delete('roi_7_day_prediction');
                      } else {
                        newSet.add('roi_7_day_prediction');
                      }
                      return newSet;
                    });
                  }}
                >
                  <div className="w-4 h-0.5 bg-yellow-500" style={{borderTop: '2px dashed'}}></div>
                  <span className="text-sm">7日ROI预测</span>
                </div>
                <div 
                  className={`flex items-center gap-1 cursor-pointer ${hiddenLines.has('roi_14_day_prediction') ? 'opacity-50' : ''}`}
                  onClick={() => {
                    setHiddenLines(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has('roi_14_day_prediction')) {
                        newSet.delete('roi_14_day_prediction');
                      } else {
                        newSet.add('roi_14_day_prediction');
                      }
                      return newSet;
                    });
                  }}
                >
                  <div className="w-4 h-0.5 bg-purple-500" style={{borderTop: '2px dashed'}}></div>
                  <span className="text-sm">14日ROI预测</span>
                </div>
                <div 
                  className={`flex items-center gap-1 cursor-pointer ${hiddenLines.has('roi_30_day_prediction') ? 'opacity-50' : ''}`}
                  onClick={() => {
                    setHiddenLines(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has('roi_30_day_prediction')) {
                        newSet.delete('roi_30_day_prediction');
                      } else {
                        newSet.add('roi_30_day_prediction');
                      }
                      return newSet;
                    });
                  }}
                >
                  <div className="w-4 h-0.5 bg-cyan-500" style={{borderTop: '2px dashed'}}></div>
                  <span className="text-sm">30日ROI预测</span>
                </div>
                <div 
                  className={`flex items-center gap-1 cursor-pointer ${hiddenLines.has('roi_60_day_prediction') ? 'opacity-50' : ''}`}
                  onClick={() => {
                    setHiddenLines(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has('roi_60_day_prediction')) {
                        newSet.delete('roi_60_day_prediction');
                      } else {
                        newSet.add('roi_60_day_prediction');
                      }
                      return newSet;
                    });
                  }}
                >
                  <div className="w-4 h-0.5 bg-orange-500" style={{borderTop: '2px dashed'}}></div>
                  <span className="text-sm">60日ROI预测</span>
                </div>
                <div 
                  className={`flex items-center gap-1 cursor-pointer ${hiddenLines.has('roi_90_day_prediction') ? 'opacity-50' : ''}`}
                  onClick={() => {
                    setHiddenLines(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has('roi_90_day_prediction')) {
                        newSet.delete('roi_90_day_prediction');
                      } else {
                        newSet.add('roi_90_day_prediction');
                      }
                      return newSet;
                    });
                  }}
                >
                  <div className="w-4 h-0.5 bg-pink-500" style={{borderTop: '2px dashed'}}></div>
                  <span className="text-sm">90日ROI预测</span>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* 图表区域 - 可横向滚动 */}
        <div style={{ width: '100%', height: 500, overflowX: 'auto' }}>
          <div style={{ minWidth: Math.max(800, historicalData.length * 50), height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatXAxis} />
              <YAxis
                scale={yScale}
                domain={yScale === 'log' ? [0.001, 'dataMax'] : ['dataMin', 'dataMax']}
                tickFormatter={formatYAxis}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border rounded shadow">
                        <p className="font-semibold">{`日期: ${label}`}</p>
                        {payload.map((entry, index) => {
                          const value = entry.value;
                          let tooltip = '';
                          
                          if (entry.dataKey === 'roi_today') {
                            tooltip = `当日ROI: ${formatNumber(value as number)}`;
                          } else if (entry.dataKey === 'roi_1_day') {
                            tooltip = `1日ROI: ${formatNumber(value as number)}`;
                          } else if (entry.dataKey === 'roi_3_day') {
                            tooltip = `3日ROI: ${formatNumber(value as number)}`;
                          } else if (entry.dataKey === 'roi_7_day') {
                            tooltip = `7日ROI: ${formatNumber(value as number)}`;
                          } else if (entry.dataKey === 'roi_14_day') {
                            tooltip = `14日ROI: ${formatNumber(value as number)}`;
                          } else if (entry.dataKey === 'roi_30_day') {
                            tooltip = `30日ROI: ${formatNumber(value as number)}`;
                          } else if (entry.dataKey === 'roi_60_day') {
                            tooltip = `60日ROI: ${formatNumber(value as number)}`;
                          } else if (entry.dataKey === 'roi_90_day') {
                            tooltip = `90日ROI: ${formatNumber(value as number)}`;
                          } else if (entry.dataKey === 'roi_today_prediction') {
                            tooltip = `当日ROI预测: ${formatNumber(value as number)}`;
                          } else if (entry.dataKey === 'roi_1_day_prediction') {
                            tooltip = `1日ROI预测: ${formatNumber(value as number)}`;
                          } else if (entry.dataKey === 'roi_3_day_prediction') {
                            tooltip = `3日ROI预测: ${formatNumber(value as number)}`;
                          } else if (entry.dataKey === 'roi_7_day_prediction') {
                            tooltip = `7日ROI预测: ${formatNumber(value as number)}`;
                          } else if (entry.dataKey === 'roi_14_day_prediction') {
                            tooltip = `14日ROI预测: ${formatNumber(value as number)}`;
                          } else if (entry.dataKey === 'roi_30_day_prediction') {
                            tooltip = `30日ROI预测: ${formatNumber(value as number)}`;
                          } else if (entry.dataKey === 'roi_60_day_prediction') {
                            tooltip = `60日ROI预测: ${formatNumber(value as number)}`;
                          } else if (entry.dataKey === 'roi_90_day_prediction') {
                            tooltip = `90日ROI预测: ${formatNumber(value as number)}`;
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
              {/* 历史数据线 */}
              <Line
                type="monotone"
                dataKey="roi_today"
                stroke="#ff0000"
                name="当日ROI"
                connectNulls={false}
                hide={hiddenLines.has('roi_today')}
              />
              <Line
                type="monotone"
                dataKey="roi_1_day"
                stroke="#0088fe"
                name="1日ROI"
                connectNulls={false}
                hide={hiddenLines.has('roi_1_day')}
              />
              <Line
                type="monotone"
                dataKey="roi_3_day"
                stroke="#00c49f"
                name="3日ROI"
                connectNulls={false}
                hide={hiddenLines.has('roi_3_day')}
              />
              <Line
                type="monotone"
                dataKey="roi_7_day"
                stroke="#ffbb28"
                name="7日ROI"
                connectNulls={false}
                hide={hiddenLines.has('roi_7_day')}
              />
              <Line
                type="monotone"
                dataKey="roi_14_day"
                stroke="#8884d8"
                name="14日ROI"
                connectNulls={false}
                hide={hiddenLines.has('roi_14_day')}
              />
              <Line
                type="monotone"
                dataKey="roi_30_day"
                stroke="#82ca9d"
                name="30日ROI"
                connectNulls={false}
                hide={hiddenLines.has('roi_30_day')}
              />
              <Line
                type="monotone"
                dataKey="roi_60_day"
                stroke="#ffc658"
                name="60日ROI"
                connectNulls={false}
                hide={hiddenLines.has('roi_60_day')}
              />
              <Line
                type="monotone"
                dataKey="roi_90_day"
                stroke="#ff7c7c"
                name="90日ROI"
                connectNulls={false}
                hide={hiddenLines.has('roi_90_day')}
              />
              {/* 预测数据线 */}
              {predictionOnlyData.length > 0 && (
                <>
                  <Line
                    type="monotone"
                    dataKey="roi_today_prediction"
                    stroke="#ff0000"
                    strokeDasharray="5 5"
                    name="当日ROI预测"
                    connectNulls={false}
                    hide={hiddenLines.has('roi_today_prediction')}
                  />
                  <Line
                    type="monotone"
                    dataKey="roi_1_day_prediction"
                    stroke="#0088fe"
                    strokeDasharray="5 5"
                    name="1日ROI预测"
                    connectNulls={false}
                    hide={hiddenLines.has('roi_1_day_prediction')}
                  />
                  <Line
                    type="monotone"
                    dataKey="roi_3_day_prediction"
                    stroke="#00c49f"
                    strokeDasharray="5 5"
                    name="3日ROI预测"
                    connectNulls={false}
                    hide={hiddenLines.has('roi_3_day_prediction')}
                  />
                  <Line
                    type="monotone"
                    dataKey="roi_7_day_prediction"
                    stroke="#ffbb28"
                    strokeDasharray="5 5"
                    name="7日ROI预测"
                    connectNulls={false}
                    hide={hiddenLines.has('roi_7_day_prediction')}
                  />
                  <Line
                    type="monotone"
                    dataKey="roi_14_day_prediction"
                    stroke="#8884d8"
                    strokeDasharray="5 5"
                    name="14日ROI预测"
                    connectNulls={false}
                    hide={hiddenLines.has('roi_14_day_prediction')}
                  />
                  <Line
                    type="monotone"
                    dataKey="roi_30_day_prediction"
                    stroke="#82ca9d"
                    strokeDasharray="5 5"
                    name="30日ROI预测"
                    connectNulls={false}
                    hide={hiddenLines.has('roi_30_day_prediction')}
                  />
                  <Line
                    type="monotone"
                    dataKey="roi_60_day_prediction"
                    stroke="#ffbb28"
                    strokeDasharray="5 5"
                    name="60日ROI预测"
                    connectNulls={false}
                    hide={hiddenLines.has('roi_60_day_prediction')}
                  />
                  <Line
                    type="monotone"
                    dataKey="roi_90_day_prediction"
                    stroke="#ff5722"
                    strokeDasharray="5 5"
                    name="90日ROI预测"
                    connectNulls={false}
                    hide={hiddenLines.has('roi_90_day_prediction')}
                  />
                </>
              )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default RoiChart;