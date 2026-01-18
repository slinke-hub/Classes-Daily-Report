import Link from 'next/link';
import ReportForm from '../../components/ReportForm';

export default function CreateReportPage() {
    return (
        <main style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <Link href="/" style={{ fontSize: '1.2em', opacity: 0.7 }}>
                    &larr; Back
                </Link>
                <h1>New GPA Report</h1>
            </div>
            <ReportForm />
        </main>
    );
}
