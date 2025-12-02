import { createStyles } from 'antd-style';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Flexbox } from 'react-layout-kit';

import { MarkdownElementProps } from '../../type';

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    margin-block-start: 12px;
    margin-block-end: 12px;
    padding: 16px;
    border: 1px solid ${token.colorBorder};
    border-radius: 8px;
    background: ${token.colorBgContainer};
  `,
  title: css`
    margin-bottom: 16px;
    font-size: 16px;
    font-weight: 600;
    color: ${token.colorText};
  `,
  error: css`
    padding: 12px;
    color: ${token.colorError};
    text-align: center;
    background: ${token.colorErrorBg};
    border-radius: 4px;
  `,
}));

interface ChartData {
  data: Record<string, any>[];
  xKey?: string;
  yKey?: string | string[];
  colors?: string[];
}

interface ChartProps extends MarkdownElementProps {
  type?: string;
  title?: string;
}

const Render = memo<ChartProps>(({ type = 'line', title, children, id }) => {
  const { t } = useTranslation('chat');
  const { styles } = useStyles();

  const chartConfig = useMemo(() => {
    try {
      const content = ((children as string) || '').toString().trim();
      if (!content) {
        return null;
      }

      const parsed: ChartData = JSON.parse(content);
      return parsed;
    } catch (error) {
      console.error('[Chart] Failed to parse chart data:', error);
      return null;
    }
  }, [children]);

  const defaultColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

  const renderChart = () => {
    if (!chartConfig || !chartConfig.data || chartConfig.data.length === 0) {
      return (
        <div className={styles.error}>
          {t('chart.invalidData', { defaultValue: 'Invalid chart data' })}
        </div>
      );
    }

    const { data, xKey, yKey, colors = defaultColors } = chartConfig;
    const xAxisKey = xKey || Object.keys(data[0])[0];
    const yKeys = Array.isArray(yKey) ? yKey : [yKey || Object.keys(data[0])[1]];

    const chartProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (type.toLowerCase()) {
      case 'line': {
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {yKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      }

      case 'bar': {
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {yKeys.map((key, index) => (
                <Bar key={key} dataKey={key} fill={colors[index % colors.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      }

      case 'area': {
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {yKeys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      }

      case 'pie': {
        const pieDataKey = yKeys[0] || Object.keys(data[0])[1];
        const nameKey = xAxisKey;

        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                dataKey={pieDataKey}
                nameKey={nameKey}
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              />
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      }

      case 'radar': {
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey={xAxisKey} />
              <PolarRadiusAxis />
              <Radar
                name="Value"
                dataKey={yKeys[0] || Object.keys(data[0])[1]}
                stroke={colors[0]}
                fill={colors[0]}
                fillOpacity={0.6}
              />
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        );
      }

      default: {
        return (
          <div className={styles.error}>
            {t('chart.unsupportedType', {
              defaultValue: 'Unsupported chart type: {{type}}',
              type,
            })}
          </div>
        );
      }
    }
  };

  return (
    <Flexbox className={styles.container} direction="vertical" gap={8}>
      {title && <div className={styles.title}>{title}</div>}
      {renderChart()}
    </Flexbox>
  );
});

Render.displayName = 'DxaiChart';

export default Render;

