import './styles.css';

export const metadata = {
  title: 'ARES Protocol Admin',
  description: 'Integration quickstart and protocol usage'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
