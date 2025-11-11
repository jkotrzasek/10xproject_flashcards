# REST API Plan - 10xproject_flashcards

## 1. Resources

The API manages the following core resources, mapped to database tables:

- **Decks** → `decks` table - Collections/categories of flashcards
- **Flashcards** → `flashcards` table - Individual learning cards with front/back content
- **Generations** → `generations` table - AI generation sessions and their metadata
- **Generation Errors** → `generation_error` table - Error logs for failed AI generations (admin access only)
- **User Auth** → `auth.users` table (managed by Supabase Auth) - User authentication and identity

## 2. Endpoints

### 2.2. Deck Endpoints

- **GET `/api/decks`**
- **Description:** Retrieve all decks belonging to the authenticated user
- **Query Parameters:**
  - `sort` (optional): `name_asc`, `name_desc`, `created_asc`, `created_desc`, `updated_asc`, `updated_desc` (default: `updated_desc`)
- **Success Response (200):**
```json
{"data": [{"id": 1, "name": "Mathematics", "created_at": "2025-11-01T10:00:00Z", "updated_at": "2025-11-10T12:00:00Z", "flashcard_count": 45}]}
```
- **Error Responses:**
  - `401 Unauthorized` - Missing or invalid authentication token

- **GET `/api/decks/:id`**
- **Description:** Retrieve details of a specific deck
- **Success Response (200):**
```json
{"data": {"id": 1, "name": "Mathematics", "created_at": "2025-11-01T10:00:00Z", "updated_at": "2025-11-10T12:00:00Z", "flashcard_count": 45}}
```
- **Error Responses:**
  - `401 Unauthorized` - Missing or invalid authentication token
  - `404 Not Found` - Deck does not exist

- **POST `/api/decks`**
- **Description:** Create a new deck
- **Request Body:**
```json
{"name": "Biology"}
```
- **Success Response (201):**
```json
{"data": {"id": 2}}
```
- **Error Responses:**
  - `400 Bad Request` - Invalid request body or validation failure
  - `401 Unauthorized` - Missing or invalid authentication token
  - `409 Conflict` - Deck with this name already exists for user

- **PATCH `/api/decks/:id`**
- **Description:** Update deck name
- **Request Body:**
```json
{"name": "Advanced Biology"}
```
- **Success Response (200):**
```json
{"data": {"id": 2, "name": "Advanced Biology"}}
```
- **Error Responses:**
  - `400 Bad Request` - Invalid request body or validation failure
  - `401 Unauthorized` - Missing or invalid authentication token
  - `404 Not Found` - Deck does not exist
  - `409 Conflict` - Deck with this name already exists for user

- **DELETE `/api/decks/:id`**
- **Description:** Delete deck and all associated flashcards (CASCADE)
- **Success Response (204):** No content
- **Error Responses:**
  - `401 Unauthorized` - Missing or invalid authentication token
  - `404 Not Found` - Deck does not exist

- **POST `/api/decks/:id/reset-progress`**
- **Description:** Reset learning progress for all flashcards in the deck
- **Success Response (204):** No content
- **Error Responses:**
  - `401 Unauthorized` - Missing or invalid authentication token
  - `404 Not Found` - Deck does not exist

### 2.3. Flashcard Endpoints

- **GET `/api/flashcards`**
- **Description:** Retrieve all user's flashcards with optional filtering
- **Query Parameters:**
  - `deck_id` (optional): number - Filter by specific deck ID
  - `unassigned` (optional): boolean - If `true`, returns only flashcards with `deck_id = null`
  - `sort` (optional): `created_asc`, `created_desc`, `updated_asc`, `updated_desc` (default: `created_asc`)
  - `source` (optional): `ai_full`, `ai_edited`, `manual` - Filter by flashcard source
  - `space_repetition` (optional): `OK`, `NOK`, `not_checked` - Filter by learning status
- **Success Response (200):**
```json
{"data": [{"id": 1, "deck_id": 1, "source": "ai_full", "front": "What is the Pythagorean theorem?", "back": "a² + b² = c² where c is the hypotenuse", "space_repetition": "not_checked", "last_repetition": null, "created_at": "2025-11-01T10:00:00Z", "updated_at": "2025-11-01T10:00:00Z"}, {"id": 2, "deck_id": null, "source": "manual", "front": "Unassigned flashcard", "back": "This flashcard is not assigned to any deck", "space_repetition": "not_checked", "last_repetition": null, "created_at": "2025-11-01T10:05:00Z", "updated_at": "2025-11-01T10:05:00Z"}]}
```
- **Error Responses:**
  - `401 Unauthorized` - Missing or invalid authentication token
  - `404 Not Found` - Deck does not exist (when `deck_id` is provided)
- **Examples:**
  - `GET /api/flashcards` - Returns all user's flashcards
  - `GET /api/flashcards?deck_id=5` - Returns flashcards from deck 5
  - `GET /api/flashcards?unassigned=true` - Returns unassigned flashcards (deck_id = null)

- **GET `/api/flashcards/:id`**
- **Description:** Retrieve details of a specific flashcard
- **Success Response (200):**
```json
{"data": {"id": 1, "deck_id": 1, "source": "ai_full", "front": "What is the Pythagorean theorem?", "back": "a² + b² = c² where c is the hypotenuse", "space_repetition": "not_checked", "last_repetition": null, "created_at": "2025-11-01T10:00:00Z", "updated_at": "2025-11-01T10:00:00Z"}}
```
- **Error Responses:**
  - `401 Unauthorized` - Missing or invalid authentication token
  - `404 Not Found` - Flashcard does not exist

- **POST `/api/flashcards`**
- **Description:** Add one or more flashcards to a deck (manual, AI-generated, or AI-edited)
- **Request Body:**
```json
{"flashcards": [{"deck_id": 1, "front": "What is mitosis?", "back": "Cell division resulting in two identical daughter cells", "source": "manual", "generation_id": null}, {"deck_id": null, "front": "What is meiosis?", "back": "Cell division producing gametes with half the chromosomes", "source": "ai_full", "generation_id": 123}]}
```
- **Request Body Fields:**
  - `flashcards` - array of objects, required, min 1 item
    - `deck_id` - number or null, required (assigns flashcard to a deck or leaves it unassigned)
    - `front` - string, required, max 200 characters
    - `back` - string, required, max 500 characters
    - `source`: Must be one of `ai_full`, `ai_edited` or `manual`
    - `generation_id`: Required for `ai_full` and `ai_edited`, must be null for `manual`
- **Success Response (201):**
```json
{"data": [{"id": 2, "front": "What is mitosis?", "back": "Cell division resulting in two identical daughter cells"}, {"id": 3, "front": "What is meiosis?", "back": "Cell division producing gametes with half the chromosomes"}]}
```
- **Error Responses:**
  - `400 Bad Request` - Invalid request body, validation failure, or empty flashcards array
  - `401 Unauthorized` - Missing or invalid authentication token
  - `404 Not Found` - Deck does not exist

- **PATCH `/api/flashcards/:id`**
- **Description:** Update flashcard content (changes source to 'ai_edited' if it was 'ai_full')
- **Request Body:**
```json
{"front": "What is cellular mitosis?", "back": "A type of cell division that results in two daughter cells with identical genetic information", "deck_id": 4}
```
- **Success Response (200):**
```json
{"data": {"id": 2, "deck_id": 2}}
```
- **Error Responses:**
  - `400 Bad Request` - Invalid request body or validation failure
  - `401 Unauthorized` - Missing or invalid authentication token
  - `404 Not Found` - Flashcard does not exist

- **DELETE `/api/flashcards/:id`**
- **Description:** Delete a single flashcard
- **Success Response (204):** No content
- **Error Responses:**
  - `401 Unauthorized` - Missing or invalid authentication token
  - `404 Not Found` - Flashcard does not exist

### 2.4. Learning System Endpoints

- **GET `/api/decks/:deckId/learn`**
- **Description:** Get flashcards due for review based on spaced repetition algorithm
- **Query Parameters:**
  - `limit` (optional): Maximum number of flashcards to return (default: 50)
- **Success Response (200):**
```json
{"data": [{"id": 1, "front": "What is the Pythagorean theorem?", "back": "a² + b² = c² where c is the hypotenuse"], "meta": {"total_due": 15, "returned": 15, "deck_total": 45}}
```
- **Error Responses:**
  - `401 Unauthorized` - Missing or invalid authentication token
  - `404 Not Found` - Deck does not exist

- **POST `/api/flashcards/:id/review`**
- **Description:** Record user's self-assessment for a flashcard
- **Request Body:**
```json
{"response": "OK"}
```
- **Success Response (204):** No content
- **Error Responses:**
  - `400 Bad Request` - Invalid response value (must be 'OK' or 'NOK')
  - `401 Unauthorized` - Missing or invalid authentication token
  - `404 Not Found` - Flashcard does not exist

### 2.5. AI Generation Endpoints

- **GET `/api/generations/limit`**
- **Description:** Check remaining AI generations for today
- **Success Response (200):**
```json
{"data": {"daily_limit": 10, "used_today": 7, "remaining": 3, "reset_at": "2025-11-11T00:00:00Z"}}
```
- **Error Responses:**
  - `401 Unauthorized` - Missing or invalid authentication token

- **POST `/api/generations`**
- **Description:** Submit text for AI flashcard generation and wait for results (synchronous)
- **Request Body:**
```json
{"input_text": "...long text content (1000-10000 characters)..."}
```
- **Success Response (200):**
```json
{"data": {"session_id": 1, "status": "success", "generated_total": 12, "flashcards_proposals": [{"front": "What is photosynthesis?", "back": "Process by which plants convert light energy into chemical energy"}, {"front": "What is mitochondria?", "back": "The powerhouse of the cell"}]}
```
- **Error Responses:**
  - `400 Bad Request` - Input text invalid
  - `401 Unauthorized` - Missing or invalid authentication token
  - `429 Too Many Requests` - Daily generation limit reached
  - `500 Internal Server Error` - AI service error (logged in `generation_error`)
  
- **Notes:**
  - This endpoint blocks until generation completes (or times out)
  - Frontend handles this as async with loading state
  - On success: saves to `generations` with `status='success'` and `generated_total`
  - On error: saves to `generations` with `status='error'` AND creates entry in `generation_error`
  - Flashcard proposals are NOT saved to `flashcards` table (ephemeral)

- **GET `/api/generations/:sessionId`**
- **Description:** Get metadata for a specific generation session
- **Success Response (200):** Sesion ID with data
- **Error Responses:**
  - `401 Unauthorized` - Missing or invalid authentication token
  - `404 Not Found` - Generation session does not exist
- **Notes:**
  - Returns only metadata, NOT flashcard proposals (those are ephemeral)

- **GET `/api/generations`**
- **Description:** Get user's generation history (last 30 days)
- **Success Response (200):** Users history - just ID, create date, text and generated total
- **Error Responses:**
  - `401 Unauthorized` - Missing or invalid authentication token

- **PATCH `/api/generations/:sessionId/accepted`**
- **Description:** Update the number of accepted flashcards for a generation session
- **Request Body:**
```json
{"accepted_total": 8}
```
- **Success Response (200):** No content
- **Error Responses:**
  - `400 Bad Request` - Invalid accepted_total (negative or > generated_total)
  - `401 Unauthorized` - Missing or invalid authentication token
  - `404 Not Found` - Generation session does not exist

### 2.6. Admin Endpoints

- **GET `/api/admin/generation-errors`**
- **Description:** Get all generation errors across all users (admin only)
- **Query Parameters:**
  - `user_id` (optional): Filter by specific user UUID
- **Success Response (200):** List of errors without user ID
- **Error Responses:**
  - `401 Unauthorized` - Missing or invalid authentication token
  - `403 Forbidden` - User is not an admin

- **Notes:**
  - Admin role is determined by checking `auth.users` metadata (role field)
  - Only admins have access to view error logs from all users

## 3. Authentication and Authorization
### 3.1. Authentication Mechanism

- **Mechanism**: Token-based authentication using Supabase Auth.
- **Process**:
    - User authenticate via `/auth/login` or `/auth/register`, receiving a bearer token
    - Protected endpoints require the token in the `Authorization` header.
    - Database-level Row-Level Security (RLS) ensures that users access only records with matching `user_id`.
- **Additional** - Use HTTPS, rate limiting, and secure error messafing to mitigate security risks.

## 4. Validation and Business Logic
### 4.1. Validation Rules by Resource

#### Decks
- **name**: not empty string 1-30 characters. Unique per user (case-insensitive)
#### Flashcards
- **front**: Not null, max length 200 characters.
- **back**: Not null, max length 500 characters.
- **source**:
  - Required, must be one of: `ai_full`, `ai_edited`, `manual`
- **space_repetition**:
  - Must be one of: `OK`, `NOK`, `not_checked`
- **deck_id**:
  - Must reference an existing deck owned by the same user
  - Validated by composite foreign key: `(user_id, deck_id) → decks(user_id, id)`
#### Generations
- **input_text**: length of 1000-10000 characters

### 4.2. Business Logic Implementation

#### Daily Generation Limit
- **Rule:** Maximum 10 AI generation requests per user per day (Europe/Warsaw timezone)
- **Implementation:**
  - Query `generations` table for count of records where:
    - `user_id = current_user`
    - `created_at >= start_of_today (Europe/Warsaw timezone)`
  - If count >= 10, reject request with `429 Too Many Requests`

#### Flashcard Source Tracking
- **Rule:** Track whether flashcard is AI-generated or manually created
- **Implementation:**
  - **Manual creation:** Set `source = 'manual'`
  - **AI generation (accepted):** Set `source = 'ai_full'`
  - **Edit AI flashcard:** Change `source` from `'ai_full'` to `'ai_edited'`

#### Spaced Repetition Management
- **Rule:** Automatically manage `last_repetition` timestamp based on review responses
- **Implementation:**
  - Database trigger: `trigger_manage_last_repetition`
  - When `space_repetition` changes to `'OK'` or `'NOK'`: Set `last_repetition = now()`
  - When `space_repetition` changes to `'not_checked'`: Set `last_repetition = NULL`
  - Algorithm for selecting due flashcards (implemented in application layer):
    - Priority 1: `space_repetition = 'not_checked' or 'NOK'`
    - Priority 2: `space_repetition = 'OK'` AND `last_repetition < now() - 7 days`

#### Cascade Deletion
- **Rule:** Maintain referential integrity when deleting parent entities

#### Generation Acceptance
- **Rule:** Track how many AI-generated flashcards were accepted by the user
- **Implementation:**
  - Accepted flashcards are sent to `POST /api/flashcards` endpoint
  - After saving, call `PATCH /api/generations/:sessionId/accepted` to update `accepted_total`

#### Data Retention
- **Rule:** Generation history retained for 30 days
- **Implementation:**
  - Cleanup function: `cleanup_old_generations()`
  - Deletes records from `generations` where `created_at < now() - 30 days`
 