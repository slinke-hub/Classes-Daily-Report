import './globals.css';
import AuthWrapper from '../components/AuthWrapper';

export const metadata = {
    title: 'MyClass | High-Performance Learning',
    description: 'Master your grades, classes, and homework with style.',
};

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PresenceHandler from '../components/PresenceHandler';

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
            </head>
            <body suppressHydrationWarning={true}>
                <AuthWrapper>
                    <PresenceHandler />
                    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
                        <Navbar />
                        <main style={{
                            flex: 1,
                            width: '100%',
                            maxWidth: '1200px',
                            margin: '0 auto',
                            padding: '0 20px 40px'
                        }}>
                            {children}
                        </main>
                        <Footer />
                    </div>
                </AuthWrapper>
            </body>
        </html>
    );
}
