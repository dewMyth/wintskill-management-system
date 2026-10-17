import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the academy name', () => {
  render(<App />);
  expect(
    screen.getByRole('heading', { name: 'Wintskill Academy' }),
  ).toBeInTheDocument();
});
