import { NextRequest, NextResponse } from 'next/server';
import { RoiData } from '@/data/models/roi';
import { getDbConnection } from '@/lib/database';

// POST 请求处理器 - 查询ROI数据
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 检查请求类型
    if (body.type === 'filter_options') {
      // 处理筛选器选项请求
      return await handleFilterOptions(body);
    }
    
    // 处理数据查询请求
    const {
      page = 1,
      limit = 100,
      app,
      country,
      bid_type: bidType,
      channel,
      roi_type: roiType,
      start_date: startDate,
      end_date: endDate,
      sort_by: sortByParam = 'date',
      sort_order: sortOrderParam = 'DESC'
    } = body;
    
    console.log('Raw channel parameter:', channel);
    console.log('ROI type parameter:', roiType);
    
    // 验证sortBy参数，防止SQL注入
    const allowedSortColumns = [
      'id', 'date', 'app', 'bid_type', 'country', 'channel', 
      'installs', 'roi_today', 'roi_1_day', 'roi_3_day', 
      'roi_7_day', 'roi_14_day', 'roi_30_day', 'roi_60_day', 
      'roi_90_day', 'roi_180d', 'created_at', 'updated_at'
    ];
    const sortBy = allowedSortColumns.includes(sortByParam) ? sortByParam : 'date';
    
    // 验证sortOrder参数
    const sortOrder = ['ASC', 'DESC'].includes(sortOrderParam.toUpperCase()) ? sortOrderParam.toUpperCase() : 'DESC';
    
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
      console.log('Processing channel:', channel, 'type:', typeof channel);
      if (channel.toLowerCase() === 'null' || channel === '') {
        console.log('Adding IS NULL condition for channel');
        conditions.push('channel IS NULL');
        // 注意：IS NULL 不需要参数
      } else {
        console.log('Adding = condition for channel:', channel);
        conditions.push('channel = ?');
        params.push(channel);
      }
    } else {
      console.log('No channel parameter provided');
    }
    
    if (startDate) {
      conditions.push('date >= ?');
      params.push(startDate);
    }
    
    if (endDate) {
      conditions.push('date <= ?');
      params.push(endDate);
    }
    
    // 如果没有指定开始日期，默认限制为最近90天（基于数据库中的最大日期）
    if (!startDate) {
      conditions.push('date >= (SELECT DATE_SUB(MAX(date), INTERVAL 90 DAY) FROM roi_data)');
    }
    
    // 为COUNT查询创建单独的参数数组
    const countParams = [...params];
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    console.log('Final WHERE clause:', whereClause);
    console.log('Final conditions array:', conditions);
    console.log('Final params array:', params);
    
    // 计算偏移量
    const offset = (page - 1) * limit;
    
    // 查询总数 - 使用GROUP BY去重后的计数
    const countQuery = 'SELECT COUNT(DISTINCT CONCAT(date, \'-\', app, \'-\', bid_type, \'-\', country, \'-\', IFNULL(channel, \'NULL\'))) as total FROM roi_data ' + whereClause;
    console.log('COUNT Query:', countQuery);
    console.log('COUNT Params:', countParams);
    
    let total;
    const connection = await getDbConnection();
    try {
      const [countResult] = await connection.execute(countQuery, countParams);
      total = (countResult as any[])[0].total;
      console.log('Count result:', total);
    } catch (countError) {
      console.error('Count query error:', countError);
      connection.release();
      throw countError;
    }
    
    // 构建查询，使用GROUP BY去重，确保每个日期、app、country、bid_type、channel组合只返回一条记录
    let dataQuery = 'SELECT ' +
      'MAX(id) as id, ' +
      'date, ' +
      'app, ' +
      'bid_type, ' +
      'country, ' +
      'channel, ' +
      'AVG(installs) as installs, ' +
      'AVG(roi_today) as roi_today, ' +
      'AVG(roi_1_day) as roi_1_day, ' +
      'AVG(roi_3_day) as roi_3_day, ' +
      'AVG(roi_7_day) as roi_7_day, ' +
      'AVG(roi_14_day) as roi_14_day, ' +
      'AVG(roi_30_day) as roi_30_day, ' +
      'AVG(roi_60_day) as roi_60_day, ' +
      'AVG(roi_90_day) as roi_90_day, ' +
      'MAX(is_real_zero) as is_real_zero, ' +
      'MAX(roi_today_is_insufficient_data) as roi_today_is_insufficient_data, ' +
      'MAX(roi_1_day_is_insufficient_data) as roi_1_day_is_insufficient_data, ' +
      'MAX(roi_3_day_is_insufficient_data) as roi_3_day_is_insufficient_data, ' +
      'MAX(roi_7_day_is_insufficient_data) as roi_7_day_is_insufficient_data, ' +
      'MAX(roi_14_day_is_insufficient_data) as roi_14_day_is_insufficient_data, ' +
      'MAX(roi_30_day_is_insufficient_data) as roi_30_day_is_insufficient_data, ' +
      'MAX(roi_60_day_is_insufficient_data) as roi_60_day_is_insufficient_data, ' +
      'MAX(roi_90_day_is_insufficient_data) as roi_90_day_is_insufficient_data ' +
      'FROM roi_data';
    let queryParams: any[] = [];
    
    // 如果有WHERE条件，添加它们
    if (whereClause) {
      dataQuery += ` ${whereClause}`;
      queryParams = [...countParams];
    }
    
    // 添加GROUP BY去重
    dataQuery += ' GROUP BY date, app, bid_type, country, channel';
    
    // 添加排序和分页
    dataQuery += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ${limit}`;
    if (page > 1) {
      const offset = (page - 1) * limit;
      dataQuery += ` OFFSET ${offset}`;
    }
    
    console.log('Final Query:', dataQuery);
    console.log('Query Params:', queryParams);
    
    let rows;
    try {
      if (queryParams.length > 0) {
        [rows] = await connection.execute(dataQuery, queryParams);
      } else {
        [rows] = await connection.execute(dataQuery);
      }
      console.log('Query successful, rows:', (rows as any[]).length);
    } catch (queryError) {
      console.error('Query failed:', queryError);
      connection.release();
      throw queryError;
    }
    
    // 返回结果
    connection.release();
    return NextResponse.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    

    
  } catch (error) {
    // 查询ROI数据失败
    return NextResponse.json(
      { 
        success: false, 
        error: '查询数据失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

// 处理筛选器选项请求的辅助函数
async function handleFilterOptions(body: any) {
  try {
    const { filter_type } = body;
    
    let query = '';
    
    switch (filter_type) {
      case 'apps':
        query = 'SELECT DISTINCT app FROM roi_data WHERE app IS NOT NULL ORDER BY app';
        break;
      case 'countries':
        query = 'SELECT DISTINCT country FROM roi_data WHERE country IS NOT NULL ORDER BY country';
        break;
      case 'bid_types':
        query = 'SELECT DISTINCT bid_type FROM roi_data WHERE bid_type IS NOT NULL ORDER BY bid_type';
        break;
      case 'channels':
        query = 'SELECT DISTINCT channel FROM roi_data WHERE channel IS NOT NULL ORDER BY channel';
        break;
      default:
        return NextResponse.json(
          { success: false, error: '无效的筛选器类型' },
          { status: 400 }
        );
    }
    
    const connection = await getDbConnection();
    const [rows] = await connection.execute(query);
    
    return NextResponse.json({
      success: true,
      data: rows
    });
    
  } catch (error) {
    // 获取筛选器选项失败
    return NextResponse.json(
      { 
        success: false, 
        error: '获取筛选器选项失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}