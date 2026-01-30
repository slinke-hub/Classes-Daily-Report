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
                <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Outfit:wght@300;400;600;700&family=Plus+Jakarta+Sans:wght@300;400;600;700&display=swap" rel="stylesheet" />
            </head>
            <body suppressHydrationWarning={true}>
                <AuthWrapper>
                    <PresenceHandler />
                    <div className="app-container">
                        <Navbar />
                        <main className="main-content">
                            {children}
                        </main>
                        <Footer />
                    </div>
                </AuthWrapper>
            </body>
        </html>
    );
}
