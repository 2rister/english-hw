const IDENTITY_URL = 'https://script.google.com/macros/s/AKfycbyT5Q9_nqThf7xQtZ89p0NWQr7e3L9NU6zTpL_A9UW0ysz_XnPyXB1ERCInhUQscbIFTA/exec';

export async function verifyBrowserSession(browserSession: string, request: typeof fetch = fetch): Promise<number> {
  if (!/^[a-f0-9]{64}$/.test(browserSession)) throw new Error('Invalid browser session');
  const response = await request(IDENTITY_URL, {
    method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({action:'browserIdentity',browserSession}), signal:AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Browser identity service unavailable');
  const result = await response.json();
  if (!result || !result.ok || !Number.isSafeInteger(result.userId) || result.userId <= 0) throw new Error('Browser sign-in expired. Connect your profile again.');
  return result.userId;
}
