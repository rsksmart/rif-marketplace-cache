declare module 'abi-decoder' {

    export interface Parameter {
        value: string
    }

    export interface DecodedData {
        params: Parameter[]
    }

    export class AbiDecoder {
      static addABI(abi: any[]): void

      static decodeMethod(input: string): DecodedData
    }

    export default AbiDecoder
}
