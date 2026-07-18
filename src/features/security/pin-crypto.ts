export interface PinCrypto {
  assertAvailable(): void;
  derive(
    pinBytes: Uint8Array,
    saltBytes: Uint8Array,
    iterations: number,
    length: number,
  ): Promise<Uint8Array>;
  timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean;
}
