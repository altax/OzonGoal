const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpdatePercentage() {
  console.log('Testing allocation_percentage update...\n');
  
  const { data: goals, error: fetchError } = await supabase
    .from('goals')
    .select('id, name, allocation_percentage')
    .eq('status', 'active')
    .limit(1);
  
  if (fetchError) {
    console.error('Fetch error:', fetchError);
    return;
  }
  
  if (!goals || goals.length === 0) {
    console.log('No active goals found.');
    return;
  }
  
  const goal = goals[0];
  console.log(`Testing with goal: "${goal.name}" (ID: ${goal.id})`);
  console.log(`Current allocation_percentage: ${goal.allocation_percentage}`);
  
  console.log('\nAttempting to update allocation_percentage to 25...');
  
  const { data: updatedGoal, error: updateError } = await supabase
    .from('goals')
    .update({ allocation_percentage: 25 })
    .eq('id', goal.id)
    .select()
    .single();
  
  if (updateError) {
    console.error('\n❌ UPDATE FAILED!');
    console.error('Error code:', updateError.code);
    console.error('Error message:', updateError.message);
    console.error('Error details:', updateError.details);
    console.error('Error hint:', updateError.hint);
    return;
  }
  
  console.log('\n✅ Update successful!');
  console.log('New allocation_percentage:', updatedGoal.allocation_percentage);
  
  console.log('\nResetting back to 0...');
  await supabase
    .from('goals')
    .update({ allocation_percentage: 0 })
    .eq('id', goal.id);
  
  console.log('Done.');
}

testUpdatePercentage().catch(console.error);
