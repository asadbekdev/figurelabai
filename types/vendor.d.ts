declare module "potrace" {
  export interface PotraceOptions {
    turdSize?: number
    optTolerance?: number
    threshold?: number
    color?: string
    background?: string
    turnPolicy?: string
    alphaMax?: number
  }

  export class Potrace {
    static THRESHOLD_AUTO: number
    constructor(options?: PotraceOptions)
    loadImage(target: unknown, callback: (error: Error | null) => void): void
    getSVG(): string
  }

  export function trace(
    file: unknown,
    options: PotraceOptions,
    callback: (error: Error | null, svg: string, instance?: Potrace) => void
  ): void

  export function posterize(
    file: unknown,
    options: PotraceOptions & { steps?: number },
    callback: (error: Error | null, svg: string) => void
  ): void
}
