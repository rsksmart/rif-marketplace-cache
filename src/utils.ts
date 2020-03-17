import { Store } from './types'

export async function asyncFilter<T> (arr: Array<T>, callback: (elem: T) => Promise<boolean>): Promise<Array<T>> {
  const fail = Symbol('async-filter-fail')
  const mappedArray = await Promise.all(arr.map(async item => (await callback(item)) ? item : fail))
  return mappedArray.filter(i => i !== fail) as T[]
}

export function scopeStore (store: Store, prefix: string): Store {
  return {
    get (key: string): any {
      return store.get(`${prefix}.${key}`)
    },

    set (key: string, value: any): void {
      store.set(`${prefix}.${key}`, value)
    }
  }
}
