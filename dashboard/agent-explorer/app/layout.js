import './styles.css';
import { Providers } from './providers';

export const metadata = {
  title: 'ARES Agent Explorer',
  description: 'Explore ARI and dispute status for agents'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
