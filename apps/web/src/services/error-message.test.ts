import { errorMessage } from './api';

describe('errorMessage', () => {
  it('uses the API message', () => {
    expect(
      errorMessage({ status: 409, data: { message: 'Already exists' } }),
    ).toBe('Already exists');
  });

  it('joins validation messages', () => {
    expect(
      errorMessage({
        status: 400,
        data: { message: ['a is required', 'b is invalid'] },
      }),
    ).toBe('a is required. b is invalid');
  });

  it('falls back for network errors', () => {
    expect(errorMessage({ status: 'FETCH_ERROR', error: 'offline' })).toBe(
      'Something went wrong. Please try again.',
    );
  });
});
