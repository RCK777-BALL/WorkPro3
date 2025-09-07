declare module "mammoth" {
  // minimal “any” shim; expand as needed
  export function convertToHtml(
    input: any,
    options?: any
  ): Promise<{ value: string; messages: Array<{ type: string; message: string }> }>;
  export function extractRawText(input: any): Promise<{ value: string }>;
  const mammoth: any;
  export default mammoth;
}
