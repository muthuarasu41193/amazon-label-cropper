export async function readFileWithProgress(
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  const reader = file.stream().getReader();
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    onProgress(Math.min(99, Math.round((received / file.size) * 100)));
  }

  onProgress(100);
}
