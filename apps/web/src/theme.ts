import type { ThemeConfig } from 'antd'

// Ant Design v5 theme — đồng bộ với CSS tokens trong styles/tokens.css.
// Import vào main.tsx và bọc app bằng <ConfigProvider theme={antdTheme}>.
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary:          '#29ABE2',
    colorLink:             '#29ABE2',
    colorSuccess:          '#059669',
    colorWarning:          '#d97706',
    colorError:            '#dc2626',
    colorInfo:             '#29ABE2',

    colorBgBase:           '#f1f5f9',
    colorBgContainer:      '#ffffff',
    colorBgElevated:       '#ffffff',
    colorBgLayout:         '#f1f5f9',

    colorBorder:           '#94a3b8',
    colorBorderSecondary:  '#cbd5e1',

    colorText:             '#0f172a',
    colorTextSecondary:    '#475569',
    colorTextTertiary:     '#94a3b8',
    colorTextQuaternary:   '#cbd5e1',

    borderRadius:     6,
    borderRadiusSM:   4,
    borderRadiusLG:   8,

    fontFamily:   '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", sans-serif',
    fontSize:     15,
    fontSizeSM:   13,
    fontSizeLG:   17,
    fontSizeXL:   21,

    lineHeight:   1.5714,

    boxShadow:    '0 1px 2px rgba(0,0,0,0.06)',
    boxShadowSecondary: '0 4px 12px rgba(0,0,0,0.08)',

    motion: true,
    motionDurationFast: '0.1s',
    motionDurationMid:  '0.15s',
    motionDurationSlow: '0.22s',
  },
  components: {
    Table: {
      headerBg:         '#f1f5f9',
      headerColor:      '#0f172a',
      headerSplitColor: 'transparent',
      rowHoverBg:       '#e2e8f0',
      borderColor:      '#94a3b8',
      cellPaddingBlock:  5,
      cellPaddingInline: 12,
      headerBorderRadius: 0,
      fontSize: 15,
    },
    Button: {
      paddingInline:       16,
      controlHeight:       34,
      controlHeightSM:     28,
      contentFontSize:     14,
      contentFontSizeSM:   13,
      primaryShadow:       'none',
      defaultShadow:       'none',
      defaultBorderColor:  '#94a3b8',
    },
    Input: {
      controlHeight:        34,
      paddingInline:        10,
      fontSize:             14,
      colorBorder:          '#94a3b8',
      colorTextPlaceholder: '#94a3b8',
    },
    Select: {
      controlHeight:   34,
      fontSize:        14,
      colorBorder:     '#94a3b8',
    },
    InputNumber: {
      controlHeight:   34,
      fontSize:        14,
      colorBorder:     '#94a3b8',
    },
    DatePicker: {
      controlHeight:   34,
      fontSize:        14,
      colorBorder:     '#94a3b8',
    },
    Form: {
      labelColor:    '#0f172a',
      labelFontSize: 13,
      labelRequiredMarkColor: '#dc2626',
    },
    Modal: {
      borderRadiusLG: 12,
      paddingContentHorizontalLG: 24,
    },
    Drawer: {
      paddingLG: 0,
    },
    Card: {
      paddingLG: 20,
      borderRadius: 12,
    },
    Tag: {
      borderRadius:  11,
      fontSizeSM:    13,
    },
    Menu: {
      itemHeight:       36,
      iconSize:         16,
      collapsedIconSize:17,
      itemBorderRadius: 6,
      subMenuItemBorderRadius: 6,
      fontSize: 14,
    },
    Tabs: {
      titleFontSize: 14,
    },
    Statistic: {
      contentFontSize: 24,
    },
  },
}
