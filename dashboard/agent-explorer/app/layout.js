import './styles.css';
import { Providers } from './providers';

export const metadata = {
  title: 'ARES Agent Explorer',
  description: 'Explore ARI and dispute status for agents'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="theme-shell">
        <div className="page-loop" aria-hidden="true" />
        <div className="page-grid-loop" aria-hidden="true" />
        <div className="page-scanline" aria-hidden="true" />
        <div className="shell-content">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
