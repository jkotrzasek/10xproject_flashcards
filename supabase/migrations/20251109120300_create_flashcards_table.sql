-- migration: create flashcards table
-- purpose: create table for storing user flashcards with optional deck assignment
-- affected tables: flashcards
-- special considerations:
--   - composite foreign key (user_id, deck_id) ensures flashcards can only be assigned to user's own decks
--   - deck_id nullable allows "unassigned" flashcards
--   - generation_id foreign key with ON DELETE SET NULL: flashcards survive generation cleanup
--   - automatic last_repetition management via trigger
--   - supports spaced repetition learning system

-- create flashcards table
-- stores flashcards owned by users, optionally assigned to decks
create table flashcards (
    -- primary key: auto-incrementing bigint
    id bigint generated always as identity primary key,
    
    -- foreign key to supabase auth.users
    -- on delete cascade: deleting a user removes all their flashcards
    user_id uuid not null references auth.users(id) on delete cascade,
    
    -- optional reference to deck (nullable for unassigned flashcards)
    -- validated by composite fk below to ensure flashcard can only be assigned to user's own deck
    deck_id bigint,
    
    -- optional reference to generation session that created this flashcard
    -- nullable: manually created flashcards have no generation_id
    -- on delete set null: when generation is deleted (e.g., 30-day cleanup), flashcard remains but loses the reference
    generation_id bigint references generations(session_id) on delete set null,
    
    -- source tracking: origin of the flashcard (ai_full, ai_edited, manual)
    -- required for metrics and analytics
    source flashcard_source not null,
    
    -- front of flashcard: question/prompt side
    -- maximum 200 characters, required
    front text not null check (char_length(front) <= 200),
    
    -- back of flashcard: answer side
    -- maximum 500 characters, required
    back text not null check (char_length(back) <= 500),
    
    -- spaced repetition status: tracks review state
    -- defaults to 'not_checked' for new flashcards
    space_repetition space_repetition_status not null default 'not_checked',
    
    -- timestamp of last review (nullable)
    -- automatically set by trigger when space_repetition changes to 'OK' or 'NOK'
    -- automatically cleared when space_repetition changes to 'not_checked'
    last_repetition timestamptz,
    
    -- timestamp: when flashcard was created (utc)
    created_at timestamptz not null default now(),
    
    -- timestamp: when flashcard was last updated (utc)
    -- automatically updated by trigger
    updated_at timestamptz not null default now(),
    
    -- composite foreign key to decks table
    -- ensures flashcard can only be assigned to a deck owned by the same user
    -- on delete cascade: deleting a deck removes all flashcards assigned to it
    -- note: only applies when deck_id is not null (unassigned flashcards unaffected)
    constraint flashcards_deck_fk 
        foreign key (user_id, deck_id) 
        references decks(user_id, id) 
        on delete cascade
);

-- index for fast lookup of user's flashcards
-- supports queries like: select * from flashcards where user_id = ?
create index idx_flashcards_user_id on flashcards(user_id);

-- partial index for fast lookup of flashcards in a specific deck
-- only indexes rows where deck_id is not null (excludes unassigned flashcards)
-- supports queries like: select * from flashcards where deck_id = ?
create index idx_flashcards_deck_id on flashcards(deck_id) where deck_id is not null;

-- composite index for learning queries
-- supports filtering by user, deck, review status and sorting by last repetition
-- useful for "cards due for review" queries
-- partial index: only for assigned flashcards
create index idx_flashcards_learning 
    on flashcards(user_id, deck_id, space_repetition, last_repetition) 
    where deck_id is not null;

-- composite index supporting foreign key constraint
-- improves performance of join operations and cascade deletes
-- partial index: only for assigned flashcards
create index idx_flashcards_user_deck on flashcards(user_id, deck_id) where deck_id is not null;

-- partial index for looking up flashcards by generation session
-- only indexes rows where generation_id is not null (excludes manually created flashcards)
-- supports queries like: select * from flashcards where generation_id = ?
create index idx_flashcards_generation_id on flashcards(generation_id) where generation_id is not null;

-- trigger function: automatically updates updated_at timestamp on row modification
create or replace function update_flashcards_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- trigger: call update function before any update on flashcards table
create trigger trigger_flashcards_updated_at
    before update on flashcards
    for each row
    execute function update_flashcards_updated_at();

-- trigger function: manages last_repetition timestamp based on space_repetition status changes
-- automatically sets last_repetition when card is reviewed (status → 'OK' or 'NOK')
-- automatically clears last_repetition when card is reset (status → 'not_checked')
create or replace function manage_flashcard_last_repetition()
returns trigger as $$
begin
    -- if space_repetition changes to 'OK' or 'NOK', set last_repetition to now()
    -- is distinct from handles null values correctly
    if (new.space_repetition in ('OK', 'NOK') and 
        (old.space_repetition is distinct from new.space_repetition)) then
        new.last_repetition = now();
    end if;
    
    -- if space_repetition changes to 'not_checked', clear last_repetition
    if (new.space_repetition = 'not_checked' and 
        (old.space_repetition is distinct from new.space_repetition)) then
        new.last_repetition = null;
    end if;
    
    return new;
end;
$$ language plpgsql;

-- trigger: call management function before updating space_repetition column
-- only fires when space_repetition column is modified
create trigger trigger_manage_last_repetition
    before update of space_repetition on flashcards
    for each row
    execute function manage_flashcard_last_repetition();

-- enable row level security on flashcards table
-- ensures users can only access their own flashcards
alter table flashcards enable row level security;

-- rls policy for select: users can only view their own flashcards
-- applies to both authenticated and anonymous users (filtered by auth.uid())
create policy flashcards_select_policy on flashcards
    for select
    using (user_id = auth.uid());

-- rls policy for insert: users can only create flashcards for themselves
-- with check ensures user_id in new row matches authenticated user
create policy flashcards_insert_policy on flashcards
    for insert
    with check (user_id = auth.uid());

-- rls policy for update: users can only modify their own flashcards
-- using clause filters which rows can be updated
-- with check ensures updated row still belongs to the user
create policy flashcards_update_policy on flashcards
    for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

-- rls policy for delete: users can only delete their own flashcards
-- using clause filters which rows can be deleted
create policy flashcards_delete_policy on flashcards
    for delete
    using (user_id = auth.uid());