export interface Store {
  get (key: string): any
  set (key: string, value: any): void
}
