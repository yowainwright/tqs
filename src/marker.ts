export const isTqsScript = (content: string): boolean =>
  content.slice(0, 500).includes("// @tqs-script");
