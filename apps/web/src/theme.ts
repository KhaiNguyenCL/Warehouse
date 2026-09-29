import type { ThemeConfig } from 'antd'

// Ant Design v5 theme — đồng bộ với CSS tokens trong styles/tokens.css.
// Import vào main.tsx và bọc app bằng <ConfigProvider theme={antdTheme}>.
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary:          '#0b5fae',
    colorLink:             '#0b5fae',
    colorSuccess:          '#0e8f45',
    colorWarning:          '#b4740a',
    colorError:            '#c22e22',
    colorInfo:             '#0b5fae',

    colorBgBase:           '#ffffff',
    colorBgContainer:      '#ffffff',
    colorBgElevated:       '#ffffff',
    colorBgLayout:         '#ffffff',

    colorBorder:           '#b7c2d6',
    colorBorderSecondary:  '#d9e0ec',

    colorText:             '#10141f',
    colorTextSecondary:    '#4b5568',
    colorTextTertiary:     '#8b96ac',
    colorTextQuaternary:   '#d9e0ec',
    // AntD mặc định colorTextDisabled rất mờ (rgba(0,0,0,.25)) — dùng cho pattern
    // "form luôn hiện input, disable khi ở chế độ xem" nên cần đủ tương phản để đọc.
    // Từng thử colorTextSecondary (#4b5568) rồi nền xám đậm dần (#e3e8f4 → #f4f6fb) nhưng
    // đều bị chê "mờ/tối" — nền càng có tint xám, chữ càng bị lấn át. Chốt: nền trắng thẳng
    // (giống colorBgContainer, không còn tint riêng cho disabled), chỉ dựa vào border +
    // con trỏ not-allowed để phân biệt "không sửa được" — chữ đậm đọc rõ như field đang sửa.
    colorTextDisabled:        '#10141f',
    colorBgContainerDisabled: '#ffffff',

    borderRadius:     6,
    borderRadiusSM:   4,
    borderRadiusLG:   8,

    fontFamily:   'Tahoma, "Segoe UI", Verdana, -apple-system, BlinkMacSystemFont, "Noto Sans", sans-serif',
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
      headerBg:         '#e9edf6',
      headerColor:      '#10141f',
      headerSplitColor: 'transparent',
      rowHoverBg:       '#dfe4f0',
      borderColor:      '#d9e0ec',
      cellPaddingBlock:  5,
      cellPaddingInline: 12,
      headerBorderRadius: 0,
      fontSize: 15,
    },
    // controlHeight 34→32, paddingInline Input 10→8 — bớt khoảng trắng thừa quanh chữ trong
    // input (bị chê "khoảng cách từ text đến border hơi nhiều"); giảm đồng bộ cả Button để
    // input+button đặt cạnh nhau (VD Bitrix Deal ID + nút Fetch) vẫn cùng chiều cao, không lệch.
    Button: {
      paddingInline:       16,
      controlHeight:       32,
      controlHeightSM:     28,
      contentFontSize:     14,
      contentFontSizeSM:   13,
      primaryShadow:       'none',
      defaultShadow:       'none',
      defaultBorderColor:  '#b7c2d6',
    },
    Input: {
      controlHeight:        32,
      paddingInline:        8,
      fontSize:             14,
      colorBorder:          '#b7c2d6',
      colorTextPlaceholder: '#8b96ac',
    },
    Select: {
      controlHeight:   32,
      fontSize:        14,
      colorBorder:     '#b7c2d6',
    },
    InputNumber: {
      controlHeight:   32,
      fontSize:        14,
      colorBorder:     '#b7c2d6',
    },
    DatePicker: {
      controlHeight:   32,
      fontSize:        14,
      colorBorder:     '#b7c2d6',
    },
    Form: {
      labelColor:    '#10141f',
      labelFontSize: 13,
      labelRequiredMarkColor: '#c22e22',
    },
    Modal: {
      borderRadiusLG: 12,
      paddingContentHorizontalLG: 24,
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
