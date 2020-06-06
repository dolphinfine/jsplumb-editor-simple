/*
 * @Author: dolphin
 * @Date: 2020-06-06 10:33:36
 * @LastEditTime: 2020-06-06 12:36:47
 * @LastEditors: dolphin
 */

const jspConfig = {
  ConnectionsDetachable: false, // 不允许拖拽断开连接
  Connector: [
    'Straight',
    {
      stub: 0,
      gap: 1,
    },
  ],
  ConnectionOverlays: [['Arrow', { location: 1, foldback: 0.5, length: 10, width: 10 }]],
  Container: 'canvas',
  DragOptions: { opacity: 0.5 },
  Endpoint: ['Dot', { radius: 5 }],
  // 因为通过style隐藏了endpoint，所以只需要默认设置即可。
  EndpointStyle: {
    stroke: '#7AB02C',
    strokeWidth: 1,
    outlineStroke: '#7AB02C',
    outlineWidth: 1,
  },
  EndpointHoverStyle: { stroke: '#409eff' },

  LabelStyle: { color: 'black' },
  MaxConnections: -1,
  PaintStyle: { strokeWidth: 2, stroke: '#409EFF' },
  HoverPaintStyle: { strokeWidth: 2, stroke: '#00c88d' },

  ReattachConnections: false,
  Scope: 'workflow',
};

export default jspConfig;
