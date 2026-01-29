
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const dotEnvPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(dotEnvPath)) {
    const lines = fs.readFileSync(dotEnvPath, 'utf8').split('\n');
    lines.forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
            process.env[key.trim()] = valueParts.join('=').trim().replace(/"/g, '');
        }
    });
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Starting DB migration...');
    const sql = `
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url TEXT;
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name TEXT;
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_type TEXT;
    `;

    try {
        const { error } = await supabase.rpc('exec_sql', { sql });
        if (error) console.error('SQL Error:', error);
        else console.log('Columns added successfully');

        const { data: buckets } = await supabase.storage.listBuckets();
        if (!buckets?.find(b => b.id === 'chat-media')) {
            const { error: bucketError } = await supabase.storage.createBucket('chat-media', { public: true });
            if (bucketError) console.error('Bucket Error:', bucketError);
            else console.log('Bucket chat-media created');
        } else {
            console.log('Bucket chat-media already exists');
        }
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

run();
