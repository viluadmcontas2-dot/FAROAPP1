import accessGate from './access-gate.js';

export default async (request, context) => {
  const response = await accessGate(request, context);
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) return response;

  const body = (await response.text()).replaceAll('VETTA', 'CalculaAê');
  const headers = new Headers(response.headers);
  headers.delete('content-length');

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
