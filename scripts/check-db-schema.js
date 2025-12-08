const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  console.log('Checking goals table schema...\n');
  
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error querying goals table:', error.message);
    
    if (error.message.includes('does not exist')) {
      console.log('\nThe goals table does not exist. You need to run the initial migration.');
    }
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Goals table columns:');
    console.log(Object.keys(data[0]).join(', '));
    
    if ('allocation_percentage' in data[0]) {
      console.log('\n✅ allocation_percentage column EXISTS');
      console.log('   Value:', data[0].allocation_percentage);
    } else {
      console.log('\n❌ allocation_percentage column is MISSING');
      console.log('   You need to run migration 002_add_allocation_percentage.sql');
    }
  } else {
    console.log('Goals table exists but is empty.');
    
    const { data: insertTest, error: insertError } = await supabase
      .from('goals')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000001',
        name: 'Test Goal',
        target_amount: 1000,
        allocation_percentage: 10
      })
      .select()
      .single();
    
    if (insertError) {
      if (insertError.message.includes('allocation_percentage')) {
        console.log('\n❌ allocation_percentage column is MISSING');
        console.log('   Error:', insertError.message);
      } else {
        console.log('\nError testing insert:', insertError.message);
      }
    } else {
      console.log('\n✅ allocation_percentage column EXISTS (tested via insert)');
      
      await supabase.from('goals').delete().eq('id', insertTest.id);
      console.log('   Test goal cleaned up.');
    }
  }
}

checkSchema().catch(console.error);
