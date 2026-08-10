/** Execute one frame without allowing a failed draw to stop the RAF loop. */
export function executeRecoverableFrame(
  draw: () => void,
  report: (error: unknown) => void,
  scheduleNext: () => void,
): void {
  try {
    draw();
  } catch (error) {
    report(error);
  } finally {
    scheduleNext();
  }
}
