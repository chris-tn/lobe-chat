import { createStyles } from 'antd-style';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
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
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { Flexbox } from 'react-layout-kit';

import { MarkdownElementProps } from '../../type';

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    width: 100%;
    margin-block-start: 12px;
    margin-block-end: 12px;
    padding: 16px;
    border: 1px solid ${token.colorBorder};
    border-radius: 8px;
    background: ${token.colorBgContainer};
  `,
  chartWrapper: css`
    width: 100%;
    min-width: 0;
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

interface ChartProps extends Omit<MarkdownElementProps, 'type'> {
  type?: string;
  title?: string;
}

const Render = memo<ChartProps>(({ type = 'line', title, children }) => {
  const { t } = useTranslation('chat');
  const { styles } = useStyles();

  const chartConfig = useMemo(() => {
    try {
      // Helper function to extract text content from ReactNode
      const extractText = (node: any): string => {
        if (typeof node === 'string') {
          return node;
        }
        if (typeof node === 'number') {
          return String(node);
        }
        if (Array.isArray(node)) {
          return node.map(extractText).join('');
        }
        if (node && typeof node === 'object') {
          // Handle React elements
          if (node.props && node.props.children) {
            return extractText(node.props.children);
          }
          // Handle text nodes from markdown
          if (node.type === 'text' && node.value) {
            return node.value;
          }
          // Fallback to string conversion
          return String(node);
        }
        return '';
      };

      // Extract content from children
      let content = extractText(children);

      // Normalize whitespace: replace all whitespace sequences with single space, then trim
      content = content.replace(/\s+/g, ' ').trim();

      if (!content) {
        return null;
      }

      // Try to find JSON object in content (handles cases with extra whitespace/text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;

      const parsed: ChartData = JSON.parse(jsonString);
      return parsed;
    } catch (error) {
      console.error('[Chart] Failed to parse chart data:', error, 'Content:', children);
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

      case 'step':
      case 'stepline': {
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
                  type="step"
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

      case 'stackbar':
      case 'stacked-bar': {
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {yKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="1"
                  fill={colors[index % colors.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      }

      case 'hbar':
      case 'horizontal-bar': {
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart layout="vertical" {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey={xAxisKey} type="category" />
              <Tooltip />
              <Legend />
              {yKeys.map((key, index) => (
                <Bar key={key} dataKey={key} fill={colors[index % colors.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      }

      case 'stacked-hbar':
      case 'stacked-horizontal-bar': {
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart layout="vertical" {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey={xAxisKey} type="category" />
              <Tooltip />
              <Legend />
              {yKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="1"
                  fill={colors[index % colors.length]}
                />
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

      case 'stacked-area': {
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
                  stackId="1"
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

      case 'donut': {
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
                innerRadius={60}
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

      case 'scatter': {
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <ZAxis range={[100, 400]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              {yKeys.map((key, index) => (
                <Scatter
                  key={key}
                  name={key}
                  dataKey={key}
                  fill={colors[index % colors.length]}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        );
      }

      case 'composed': {
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {yKeys[0] && <Bar dataKey={yKeys[0]} fill={colors[0]} />}
              {yKeys[1] && (
                <Line type="monotone" dataKey={yKeys[1]} stroke={colors[1]} strokeWidth={2} />
              )}
              {yKeys[2] && (
                <Area
                  type="monotone"
                  dataKey={yKeys[2]}
                  fill={colors[2]}
                  fillOpacity={0.6}
                  stroke={colors[2]}
                />
              )}
            </ComposedChart>
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
    <Flexbox className={styles.container} direction="vertical" gap={8} width="100%">
      {title && <div className={styles.title}>{title}</div>}
      {renderChart()}
    </Flexbox>
  );
});

Render.displayName = 'DxaiChart';

export default Render;

