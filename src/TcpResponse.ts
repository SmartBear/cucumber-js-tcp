export type TcpResponse = {
  organization: {
    tests: {
      nodes: {
        failureFrequency: number
        path: string
      }[]
    }
  }
}
