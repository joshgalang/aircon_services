export function apiErrorMessage(e: unknown, fallback: string): string {
  if (
    typeof e === "object" &&
    e !== null &&
    "response" in e &&
    typeof (e as { response?: { data?: { error?: string } } }).response?.data
      ?.error === "string"
  ) {
    return (e as { response: { data: { error: string } } }).response.data.error;
  }
  return fallback;
}
