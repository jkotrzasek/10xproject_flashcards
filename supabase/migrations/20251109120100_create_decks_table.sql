-- migration: create decks table
-- purpose: create table for storing user flashcard decks (categories)
-- affected tables: decks
-- special considerations: 
--   - uses citext for case-insensitive unique names
--   - references auth.users managed by supabase auth
--   - includes composite unique constraint on (user_id, name)

-- create decks table
-- stores flashcard decks (categories) owned by users
create table decks (
    -- primary key: auto-incrementing bigint
    id bigint generated always as identity primary key,
    
    -- foreign key to supabase auth.users
    -- on delete cascade: deleting a user removes all their decks
    user_id uuid not null references auth.users(id) on delete cascade,
    
    -- deck name: case-insensitive text with length constraint
    -- citext allows case-insensitive uniqueness while preserving original case
    -- must be between 1 and 30 characters
    name citext not null check (char_length(name) <= 30 and char_length(name) > 0),
    
    -- timestamp: when deck was created (utc)
    created_at timestamptz not null default now(),
    
    -- timestamp: when deck was last updated (utc)
    -- automatically updated by trigger
    updated_at timestamptz not null default now(),
    
    -- unique constraint: each user can have only one deck with a given name
    -- case-insensitive due to citext type
    constraint decks_user_name_unique unique (user_id, name)
);

-- index for fast lookup of user's decks
-- supports queries like: select * from decks where user_id = ?
create index idx_decks_user_id on decks(user_id);

-- unique composite index to support foreign key from flashcards table
-- enables efficient cascade operations when deleting decks
-- supports flashcards table's composite fk: (user_id, deck_id) → decks(user_id, id)
create unique index idx_decks_user_id_id on decks(user_id, id);

-- trigger function: automatically updates updated_at timestamp on row modification
create or replace function update_decks_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- trigger: call update function before any update on decks table
create trigger trigger_decks_updated_at
    before update on decks
    for each row
    execute function update_decks_updated_at();

-- enable row level security on decks table
-- ensures users can only access their own decks
alter table decks enable row level security;

-- rls policy for select: users can only view their own decks
-- applies to both authenticated and anonymous users (filtered by auth.uid())
create policy decks_select_policy on decks
    for select
    using (user_id = auth.uid());

-- rls policy for insert: users can only create decks for themselves
-- with check ensures user_id in new row matches authenticated user
create policy decks_insert_policy on decks
    for insert
    with check (user_id = auth.uid());

-- rls policy for update: users can only modify their own decks
-- using clause filters which rows can be updated
-- with check ensures updated row still belongs to the user
create policy decks_update_policy on decks
    for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- rls policy for delete: users can only delete their own decks
-- using clause filters which rows can be deleted
create policy decks_delete_policy on decks
    for delete
    using (user_id = auth.uid());

