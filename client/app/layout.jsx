import '../src/index.css';
import '../src/App.css';
import '../src/clinic.css';

export const metadata = {
  title: 'MarketHub — Good things. Good people.',
  description: 'Thoughtful finds from independent shops, makers, and the people behind them.',
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
