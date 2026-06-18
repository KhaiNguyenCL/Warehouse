// Entry point của mobile app (Expo). Khác web — không có index.html, App.tsx
// là root component, Expo tự render nó lên màn hình thiết bị.
import { Text, View, StyleSheet } from 'react-native'

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>WMS Mobile</Text>
      <Text>DNS Technology Invest Co., Ltd</Text>
      {/* TODO: thêm navigation (expo-router) + màn hình quét SN bằng expo-camera */}
    </View>
  )
}

// StyleSheet.create — cách viết CSS của React Native, không dùng class CSS như web,
// mà viết style là object JS, áp trực tiếp vào prop style={} của component.
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },  // flex: 1 = chiếm hết màn hình
  title:     { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
})
