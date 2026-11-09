export function exceedsBodyLimit(request: Request, maximumBytes: number): boolean {
  const contentLength = request.headers.get("content-length");
  if (contentLength === null) return false;
  return !/^\d+$/.test(contentLength) || Number(contentLength) > maximumBytes;
}
