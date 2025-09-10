import { NextRequest, NextResponse } from 'next/server';
import { RoiData } from '@/data/models/roi';
import { getDbConnection } from '@/lib/database';

// 动态导入以避免客户端打包问题
let parse: any;
let mysql: any;

try {
  const csvParse = require('csv-parse/sync');
  parse = csvParse.parse;
  mysql = require('mysql2/promise');
} catch (error) {
  // Failed to load server-side dependencies
}

// 验证ROI数据格式
// 字段映射：中文字段名 -> 英文字段名
function mapChineseFields(data: any): any {
  const fieldMapping: { [key: string]: string } = {
    '日期': 'date',
    'app': 'app',
    '出价类型': 'bid_type',
    '国家地区': 'country',
    '应用安装.总次数': 'installs',
    '当日ROI': 'roi_today',
    '1日ROI': 'roi_1_day',
    '3日ROI': 'roi_3_day',
    '7日ROI': 'roi_7_day',
    '14日ROI': 'roi_14_day',
    '30日ROI': 'roi_30_day',
    '60日ROI': 'roi_60_day',
    '90日ROI': 'roi_90_day'
  };

  const mappedData: any = {};
  
  for (const [chineseKey, englishKey] of Object.entries(fieldMapping)) {
    if (data[chineseKey] !== undefined) {
      let value = data[chineseKey];
      
      // 处理日期格式
      if (englishKey === 'date' && typeof value === 'string') {
        // 提取日期部分，移除括号中的星期信息
        const dateMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          value = dateMatch[1];
        }
      }
      
      // 处理ROI百分比数据
      if (englishKey.startsWith('roi_') && typeof value === 'string') {
        // 移除百分号和逗号，转换为数字
        value = value.replace(/[%,]/g, '');
        value = parseFloat(value) / 100; // 转换为小数
      }
      
      // 处理安装次数
      if (englishKey === 'installs' && typeof value === 'string') {
        value = parseInt(value.replace(/,/g, ''), 10);
      }
      
      mappedData[englishKey] = value;
    }
  }
  
  return mappedData;
}

function validateRoiData(data: any): data is RoiData {
  return (
    typeof data.date === 'string' &&
    typeof data.app === 'string' &&
    typeof data.bid_type === 'string' &&
    typeof data.country === 'string' &&
    typeof data.installs === 'number' &&
    (data.roi_today === undefined || typeof data.roi_today === 'number') &&
    typeof data.roi_1_day === 'number' &&
    typeof data.roi_3_day === 'number' &&
    typeof data.roi_7_day === 'number' &&
    typeof data.roi_14_day === 'number' &&
    typeof data.roi_30_day === 'number' &&
    typeof data.roi_60_day === 'number' &&
    typeof data.roi_90_day === 'number'
  );
}

export async function POST(request: NextRequest) {
  try {
    // 获取表单数据
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: '未找到文件' }, { status: 400 });
    }

    // 检查文件类型
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: '只支持CSV文件' }, { status: 400 });
    }

    // 读取文件内容
    const fileBuffer = await file.arrayBuffer();
    const fileContent = new TextDecoder().decode(fileBuffer);

    // 解析CSV
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    // 验证数据格式
    const validRecords: RoiData[] = [];
    const invalidRecords: any[] = [];

    for (const record of records) {
      // 映射中文字段名到英文字段名
      const mappedRecord = mapChineseFields(record);
      
      // 设置默认channel值
      if (!mappedRecord.channel) {
        mappedRecord.channel = 'organic';
      }
      
      // 智能处理0%数据 - 基于数据日期本身的逻辑判断
      // 注意：这里不应该用当前时间倒推，而是基于数据的日期来判断ROI字段的合理性
      const dataDate = new Date(mappedRecord.date);
      
      // 对于历史数据，我们假设数据是完整的，除非有明确的业务逻辑表明某个ROI字段应该为0
      // 这里我们简化处理：如果ROI值为0，我们假设它是真实的0值，而不是数据不足导致的
      const daysSinceEpoch = Math.floor(dataDate.getTime() / (1000 * 60 * 60 * 24));
      
      // ROI字段和对应的天数要求
      const roiFieldsWithDays = [
        { field: 'roi_today', requiredDays: 0 },
        { field: 'roi_1_day', requiredDays: 1 },
        { field: 'roi_3_day', requiredDays: 3 },
        { field: 'roi_7_day', requiredDays: 7 },
        { field: 'roi_14_day', requiredDays: 14 },
        { field: 'roi_30_day', requiredDays: 30 },
        { field: 'roi_60_day', requiredDays: 60 },
        { field: 'roi_90_day', requiredDays: 90 }
      ] as const;
      
      let hasAnyRealZero = false;
      
      // 为每个ROI字段判断是否因数据不足而为0%
      // 修正逻辑：对于历史数据，我们假设所有0值都是真实的业务结果
      for (const { field, requiredDays } of roiFieldsWithDays) {
        if (mappedRecord[field] === 0) {
          // 对于历史数据，0值被认为是真实的业务结果，而不是数据不足
          mappedRecord[`${field}_is_insufficient_data`] = false;
          hasAnyRealZero = true;
        } else {
          // 非0值
          mappedRecord[`${field}_is_insufficient_data`] = false;
        }
      }
      
      // 设置总体标识：如果有任何真实的0%，则标记为true
      mappedRecord.is_real_zero = hasAnyRealZero;
      
      if (validateRoiData(mappedRecord)) {
        validRecords.push(mappedRecord);
      } else {
        invalidRecords.push({ original: record, mapped: mappedRecord });
      }
    }

    if (validRecords.length === 0) {
      return NextResponse.json(
        { error: '没有有效的数据记录' },
        { status: 400 }
      );
    }

    // 获取数据库连接
    let connection;
    try {
      connection = await getDbConnection();
    } catch (connectError: any) {
      // 数据库连接失败
      return NextResponse.json(
        { error: '数据库连接失败: ' + (connectError?.message || '未知错误') },
        { status: 500 }
      );
    }

    try {
      // 开始事务
      await connection.beginTransaction();

      // 创建表（如果不存在）
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS roi_data (
          id INT AUTO_INCREMENT PRIMARY KEY,
          date DATE NOT NULL,
          app VARCHAR(255) NOT NULL,
          bid_type VARCHAR(100) NOT NULL,
          country VARCHAR(100) NOT NULL,
          channel VARCHAR(100) DEFAULT 'organic',
          installs INT NOT NULL DEFAULT 0,
          roi_today DECIMAL(10,4) DEFAULT 0,
          roi_1_day DECIMAL(10,4) DEFAULT 0,
          roi_3_day DECIMAL(10,4) DEFAULT 0,
          roi_7_day DECIMAL(10,4) DEFAULT 0,
          roi_14_day DECIMAL(10,4) DEFAULT 0,
          roi_30_day DECIMAL(10,4) DEFAULT 0,
          roi_60_day DECIMAL(10,4) DEFAULT 0,
          roi_90_day DECIMAL(10,4) DEFAULT 0,
          is_real_zero BOOLEAN DEFAULT FALSE COMMENT '是否为真实0%（FALSE表示数据不足导致的0%）',
          roi_today_is_insufficient_data BOOLEAN DEFAULT FALSE COMMENT '当日ROI是否因数据不足为0%',
          roi_1_day_is_insufficient_data BOOLEAN DEFAULT FALSE COMMENT '1日ROI是否因数据不足为0%',
          roi_3_day_is_insufficient_data BOOLEAN DEFAULT FALSE COMMENT '3日ROI是否因数据不足为0%',
          roi_7_day_is_insufficient_data BOOLEAN DEFAULT FALSE COMMENT '7日ROI是否因数据不足为0%',
          roi_14_day_is_insufficient_data BOOLEAN DEFAULT FALSE COMMENT '14日ROI是否因数据不足为0%',
          roi_30_day_is_insufficient_data BOOLEAN DEFAULT FALSE COMMENT '30日ROI是否因数据不足为0%',
          roi_60_day_is_insufficient_data BOOLEAN DEFAULT FALSE COMMENT '60日ROI是否因数据不足为0%',
          roi_90_day_is_insufficient_data BOOLEAN DEFAULT FALSE COMMENT '90日ROI是否因数据不足为0%',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_record (date, app, bid_type, country, channel)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // 插入数据
      for (const record of validRecords) {
        await connection.execute(
          `
          INSERT INTO roi_data 
            (date, app, bid_type, country, channel, installs, roi_today, roi_1_day, roi_3_day, roi_7_day, roi_14_day, roi_30_day, roi_60_day, roi_90_day, is_real_zero)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            installs = VALUES(installs),
            roi_today = VALUES(roi_today),
            roi_1_day = VALUES(roi_1_day),
            roi_3_day = VALUES(roi_3_day),
            roi_7_day = VALUES(roi_7_day),
            roi_14_day = VALUES(roi_14_day),
            roi_30_day = VALUES(roi_30_day),
            roi_60_day = VALUES(roi_60_day),
            roi_90_day = VALUES(roi_90_day),
            is_real_zero = VALUES(is_real_zero)
        `,
          [
            record.date,
            record.app,
            record.bid_type,
            record.country,
            record.channel,
            record.installs,
            record.roi_today,
            record.roi_1_day,
            record.roi_3_day,
            record.roi_7_day,
            record.roi_14_day,
            record.roi_30_day,
            record.roi_60_day,
            record.roi_90_day,
            record.is_real_zero,
          ]
        );
      }

      // 提交事务
      await connection.commit();

      return NextResponse.json({
        success: true,
        message: `成功导入 ${validRecords.length} 条记录`,
        invalidCount: invalidRecords.length,
      });
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      return NextResponse.json(
        { error: `数据库错误: ${(error as Error).message}` },
        { status: 500 }
      );
    } finally {
      // 释放连接
      connection.release();
    }
  } catch (error) {
    return NextResponse.json(
      { error: `处理CSV文件错误: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}