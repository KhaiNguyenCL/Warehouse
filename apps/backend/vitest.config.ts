import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./test/setup.ts'],
    // Các test file dùng chung 1 DB (wms_test_db) và setup.ts xoá data trước mỗi test —
    // chạy song song nhiều file sẽ làm test ghi đè/xoá data của nhau giữa lúc đang chạy.
    fileParallelism: false,
    hookTimeout: 20000,
  },
})
