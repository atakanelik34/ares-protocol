import './styles.css';

export const metadata = {
  title: 'ARES Protocol Admin',
  description: 'Integration quickstart and protocol usage'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="theme-shell">
        <div className="page-video" aria-hidden="true">
          <video autoPlay muted loop playsInline preload="auto">
            <source src="https://ares-protocol.xyz/landing-assets/site-background-loop.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="page-loop" aria-hidden="true" />
        <div className="page-grid-loop" aria-hidden="true" />
        <div className="page-scanline" aria-hidden="true" />
        <div className="shell-content">{children}</div>
      </body>
    </html>
  );
}
