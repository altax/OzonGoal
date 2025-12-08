const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkGoalPercentages() {
  console.log('Checking goal allocation percentages...\n');
  
  const { data, error } = await supabase
    .from('goals')
    .select('id, name, allocation_percentage, status')
    .eq('status', 'active')
    .order('order_index', { ascending: true });
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('No active goals found.');
    return;
  }
  
  console.log('Active goals:');
  console.log('---');
  for (const goal of data) {
    console.log(`${goal.name}: ${goal.allocation_percentage ?? 'NULL'}%`);
  }
  console.log('---');
  console.log(`Total: ${data.reduce((sum, g) => sum + (g.allocation_percentage || 0), 0)}%`);
}

checkGoalPercentages().catch(console.error);
