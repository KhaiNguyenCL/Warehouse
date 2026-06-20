// carbone không có type definition công khai (chưa có @types/carbone) — khai báo tối
// thiểu phần API mình thực sự dùng (carbone.render) để hết lỗi "implicitly has an any type".
declare module 'carbone' {
  interface CarboneInstance {
    render(
      templatePath: string,
      data: unknown,
      options: Record<string, unknown>,
      callback: (err: Error | null, result: Buffer, extension: string) => void,
    ): void
  }

  const carbone: CarboneInstance
  export default carbone
}
