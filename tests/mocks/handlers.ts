import { http, HttpResponse } from 'msw';

/**
 * MSW handlers for mocking API requests in tests.
 * Add your API mock handlers here.
 */
export const handlers = [
  // Example handler - replace with your actual API endpoints
  http.get('/api/example', () => {
    return HttpResponse.json({
      message: 'This is a mocked response',
    });
  }),
];

