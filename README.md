# Express MySQL Notes API
 
## Overview
This is a RESTful API built using Express.js and MySQL that allows users to create, read, update, and delete notes. Users can also share notes with others using their email addresses and search for notes using keywords. JWT authentication is used for securing API requests.

## Installation

### Prerequisites

- Node.js
- MySQL database

### Steps to Install

1. Clone this repository
```
git clone <repo-url>
cd <repo-directory>
```
2. Install dependencies
```
npm install
```
3. Setup a .env file in the root directory with the following:
```
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASS=your_database_password
DB_NAME=your_database_name
JWT_SECRET=your_jwt_secret
```
4. Run the server:
```
node server.js
```

The API will be available at http://localhost:3000

## API Endpoints
### Authentication

1. Sign Up
Endpoint: POST /api/auth/signup
This will register a new user.
Request body:
```
{
    "username": "user123",
    "email": "user@example.com",
    "password": "securepassword"
}
```
Response:
```
{
    "message": "User created"
}
```

2. Login
Endpoint: POST /api/auth/login
Logs in a user using their username or email.
Request body:
```
{
    "identifier": "user@example.com",  //Can be email or username
    "password": "securepassword"
}
```
Response:
```
{
    "token": "your_jwt_token"
}
```

### Note Management

3. Get All Notes
Endpoint: GET /api/notes
Retrieves all notes the authenticated user owns or has access to.
Request body:
```
{
  "Authorization": "Bearer your_jwt_token"
}
```
Response:
```
[
  {
    "id": 1,
    "title": "My Note",
    "content": "This is a sample note",
    "user_id": 2
  }
]
```

4. Get a Note by id
Endpoint: GET /api/notes/:id
Retrieves a single note if the user has access.

5. Create a Note
Endpoint: POST /api/notes
Creates a new note.
Request body:
```
{
  "title": "New Note",
  "content": "This is the note content."
}
```
Response:
```
{
  "message": "Note created",
  "id": 1
}
```

6. Update a Note
Endpoint: PUT /api/notes/:id
Description: Updates a note if the user is the owner.

7. Delete a Note
Endpoint: DELETE /api/notes/:id
Description: Deletes a note if the user is the owner.

### Sharing Notes

8. Share a Note
Endpoint: POST /api/notes/:id/share
Description: Shares a note with another user via email.
```
{
  "sharedWithEmail": "friend@example.com"
}
```
Response:
```
{
  "message": "Note shared successfully"
}
```

### Searching Notes

9. Search Notes
Endpoint: GET /api/search?q=keyword
Description: Searches notes based on a keyword.

## Database Schema
```
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FULLTEXT (title, content)
);

CREATE TABLE shared_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    note_id INT NOT NULL,
    shared_with INT NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id),
    FOREIGN KEY (shared_with) REFERENCES users(id)
);
```

## Technologies Used

- Express.js - Web framework
- MySQL - Database
- jsonwebtoken (JWT) - Authentication
- bcryptjs - Password hashing
- CORS - Cross-Origin Resource Sharing