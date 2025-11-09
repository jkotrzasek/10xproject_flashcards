-- migration: create cleanup function for old generations
-- purpose: implement data retention policy for generations table (30 days)
-- affected tables: generations, generation_error (cascade)
-- special considerations:
--   - destructive operation: permanently deletes old records
--   - must be invoked by external scheduler (supabase edge function, github actions, etc.)
--   - security definer: runs with elevated privileges to bypass rls
--   - cascade deletion: also removes associated generation_error records

-- cleanup function: removes generation records older than 30 days
-- this function implements the data retention policy to prevent unbounded table growth
-- 
-- execution strategy:
--   supabase typically requires external scheduling for periodic tasks
--   options for invoking this function:
--   1. supabase edge function called by external cron service (recommended)
--   2. github actions workflow with scheduled trigger
--   3. external service (e.g., cloud scheduler, vercel cron)
--
-- warning: this is a destructive operation
--   permanently deletes generation records older than 30 days
--   cascade deletes associated generation_error records
--   cannot be undone - ensure backups are in place if needed
create or replace function cleanup_old_generations()
returns void as $$
begin
    -- delete all generation records created more than 30 days ago
    -- cascade delete will automatically remove associated generation_error records
    -- affected rows are not returned (returns void)
    delete from generations
    where created_at < now() - interval '30 days';
end;
$$ language plpgsql security definer;

-- note on security definer:
-- function runs with privileges of the user who created it (typically superuser/admin)
-- this is necessary because:
--   1. rls policies would normally restrict deletion to user's own records
--   2. cleanup needs to delete records across all users
--   3. external scheduler may not have user context
-- 
-- security implications:
--   - function has no parameters, limiting potential for sql injection
--   - logic is straightforward and auditable
--   - only deletes based on fixed retention period (not user-controllable)

-- example invocation patterns:
-- 
-- option 1: supabase edge function (deno)
-- ```typescript
-- import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
-- import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
-- 
-- serve(async (req) => {
--   const supabase = createClient(
--     Deno.env.get('SUPABASE_URL'),
--     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
--   )
--   await supabase.rpc('cleanup_old_generations')
--   return new Response('Cleanup completed', { status: 200 })
-- })
-- ```
-- 
-- option 2: github actions workflow
-- schedule this to run daily at 2am utc:
-- ```yaml
-- on:
--   schedule:
--     - cron: '0 2 * * *'
-- jobs:
--   cleanup:
--     runs-on: ubuntu-latest
--     steps:
--       - name: call cleanup function
--         run: |
--           curl -X POST "${{ secrets.SUPABASE_URL }}/rest/v1/rpc/cleanup_old_generations" \
--             -H "apikey: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
--             -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
-- ```

