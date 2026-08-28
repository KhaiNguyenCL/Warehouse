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

    colorBgBase:           '#ffffff',
    colorBgContainer:      '#ffffff',
    colorBgElevated:       '#ffffff',
    colorBgLayout:         '#ffffff',

    colorBorder:           '#b6ac9c',
    colorBorderSecondary:  '#ddd6cc',

    colorText:             '#1c1917',
    colorTextSecondary:    '#57534e',
    colorTextTertiary:     '#a8a29e',
    colorTextQuaternary:   '#ddd6cc',

    borderRadius:     6,
    borderRadiusSM:   4,
    borderRadiusLG:   8,

    fontFamily:   '"Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", sans-serif',
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
      headerBg:         '#f2efe9',
      headerColor:      '#1c1917',
      headerSplitColor: 'transparent',
      rowHoverBg:       '#ece8e0',
      borderColor:      '#ddd6cc',
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
      defaultBorderColor:  '#b6ac9c',
    },
    Input: {
      controlHeight:        34,
      paddingInline:        10,
      fontSize:             14,
      colorBorder:          '#b6ac9c',
      colorTextPlaceholder: '#a8a29e',
    },
    Select: {
      controlHeight:   34,
      fontSize:        14,
      colorBorder:     '#b6ac9c',
    },
    InputNumber: {
      controlHeight:   34,
      fontSize:        14,
      colorBorder:     '#b6ac9c',
    },
    DatePicker: {
      controlHeight:   34,
      fontSize:        14,
      colorBorder:     '#b6ac9c',
    },
    Form: {
      labelColor:    '#1c1917',
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
