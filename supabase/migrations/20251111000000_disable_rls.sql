-- migration: disable row level security
-- purpose: disable rls for MVP development on decks, generations, flashcards, and generation_error tables
-- affected tables: decks, generations, flashcards, generation_error
-- special considerations:
--   - disables rls enforcement entirely on these tables
--   - also drops any existing policies for cleanup

-- disable rls on decks table
ALTER TABLE decks DISABLE ROW LEVEL SECURITY;

-- disable rls on generations table  
ALTER TABLE generations DISABLE ROW LEVEL SECURITY;

-- disable rls on flashcards table
ALTER TABLE flashcards DISABLE ROW LEVEL SECURITY;

-- disable rls on generation_error table
ALTER TABLE generation_error DISABLE ROW LEVEL SECURITY;

-- cleanup: drop existing policies if they exist
DROP POLICY IF EXISTS decks_select_policy ON decks;
DROP POLICY IF EXISTS decks_insert_policy ON decks;
DROP POLICY IF EXISTS decks_update_policy ON decks;
DROP POLICY IF EXISTS decks_delete_policy ON decks;

DROP POLICY IF EXISTS generations_select_policy ON generations;
DROP POLICY IF EXISTS generations_insert_policy ON generations;
DROP POLICY IF EXISTS generations_update_policy ON generations;
DROP POLICY IF EXISTS generations_delete_policy ON generations;

DROP POLICY IF EXISTS flashcards_select_policy ON flashcards;
DROP POLICY IF EXISTS flashcards_insert_policy ON flashcards;
DROP POLICY IF EXISTS flashcards_update_policy ON flashcards;
DROP POLICY IF EXISTS flashcards_delete_policy ON flashcards;

DROP POLICY IF EXISTS generation_error_select_policy ON generation_error;
DROP POLICY IF EXISTS generation_error_insert_policy ON generation_error;
DROP POLICY IF EXISTS generation_error_update_policy ON generation_error;
DROP POLICY IF EXISTS generation_error_delete_policy ON generation_error;

