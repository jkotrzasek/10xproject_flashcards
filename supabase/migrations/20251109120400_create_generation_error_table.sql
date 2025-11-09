-- migration: create generation_error table
-- purpose: create table for storing error details from failed ai generation sessions
-- affected tables: generation_error
-- special considerations:
--   - 1:1 relationship with generations table (session_id is both pk and fk)
--   - only created when generations.status = 'error'
--   - automatically deleted when parent generation is deleted (cascade)

-- create generation_error table
-- stores error information for failed ai generation sessions
-- one-to-one relationship with generations table
create table generation_error (
    -- primary key and foreign key to generations table
    -- enforces 1:1 relationship: one generation can have at most one error record
    -- on delete cascade: deleting a generation removes its error record
    session_id bigint primary key references generations(session_id) on delete cascade,
    
    -- foreign key to supabase auth.users
    -- on delete cascade: deleting a user removes their generation errors
    -- denormalized for rls policies (avoids join in security checks)
    user_id uuid not null references auth.users(id) on delete cascade,
    
    -- optional error code from ai api
    -- nullable: some errors may not have specific codes
    error_code text,
    
    -- error message describing what went wrong
    -- required for debugging and user feedback
    message text not null,
    
    -- timestamp: when error was recorded (utc)
    created_at timestamptz not null default now()
);

-- index for fast lookup of user's generation errors
-- supports queries like: select * from generation_error where user_id = ?
create index idx_generation_error_user_id on generation_error(user_id);

-- enable row level security on generation_error table
-- ensures users can only access their own error records
alter table generation_error enable row level security;

-- rls policy for select: users can only view their own generation errors
-- applies to both authenticated and anonymous users (filtered by auth.uid())
create policy generation_error_select_policy on generation_error
    for select
    using (user_id = auth.uid());

-- rls policy for insert: users can only create error records for themselves
-- with check ensures user_id in new row matches authenticated user
create policy generation_error_insert_policy on generation_error
    for insert
    with check (user_id = auth.uid());

-- rls policy for update: users can only modify their own generation errors
-- using clause filters which rows can be updated
-- with check ensures updated row still belongs to the user
create policy generation_error_update_policy on generation_error
    for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- rls policy for delete: users can only delete their own generation errors
-- using clause filters which rows can be deleted
create policy generation_error_delete_policy on generation_error
    for delete
    using (user_id = auth.uid());

