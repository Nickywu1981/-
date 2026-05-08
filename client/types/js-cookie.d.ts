declare module "js-cookie" {
  export default class Cookies {
    static get(name: string): string | undefined
    static set(name: string, value: string, opts?: any): void
    static remove(name: string): void
  }
}
