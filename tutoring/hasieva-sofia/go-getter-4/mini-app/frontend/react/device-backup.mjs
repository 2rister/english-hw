// Only the authenticated learner's scoped keys are passed here; never enumerate browser storage.
export async function backupDeviceState(tutoring, unit, values) {
  const dump = JSON.stringify(values);
  const captureId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const chunks = dump.length <= 44000 ? [dump] : Array.from({length: Math.ceil(dump.length / 20000)}, (_, index) =>
    JSON.stringify({format: "learner-device-chunk-v1", captureId, index, total: Math.ceil(dump.length / 20000), data: dump.slice(index * 20000, (index + 1) * 20000)}));
  for (const chunk of chunks) {
    const result = await tutoring.call("deviceDump", null, null, unit, chunk);
    if (result.saved !== chunk.length) throw Error("Local progress backup is not confirmed. Retrying shortly.");
  }
}
