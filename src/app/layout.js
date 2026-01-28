import './globals.css';
import AuthWrapper from '../components/AuthWrapper';

export const metadata = {
    title: 'GPA Reports',
    description: 'Daily gpa progress reports',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body suppressHydrationWarning={true}>
                <AuthWrapper>
                    {children}
                </AuthWrapper>
            </body>
        </html>
    );
}
