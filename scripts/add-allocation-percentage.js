const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addAllocationPercentage() {
  console.log('Adding allocation_percentage column to goals table...\n');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE goals ADD COLUMN IF NOT EXISTS allocation_percentage INTEGER DEFAULT 0;
      ALTER TABLE goals ADD CONSTRAINT IF NOT EXISTS allocation_percentage_range 
        CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100);
    `
  });
  
  if (error) {
    console.log('Note: Direct SQL via RPC may not be available with anon key.');
    console.log('Error:', error.message);
    console.log('\n--- Manual Steps Required ---');
    console.log('Please run this SQL in your Supabase SQL Editor:');
    console.log('');
    console.log('ALTER TABLE goals ADD COLUMN IF NOT EXISTS allocation_percentage INTEGER DEFAULT 0;');
    console.log('');
    console.log('ALTER TABLE goals ADD CONSTRAINT allocation_percentage_range');
    console.log('  CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100);');
    console.log('');
    return;
  }
  
  console.log('✅ allocation_percentage column added successfully!');
}

addAllocationPercentage().catch(console.error);
