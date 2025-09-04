

# Gresh Finance

This project is a **backend service** for managing customers, accounts, and transactions within a banking system. It provides core functionalities such as user registration, secure login, comprehensive account management, and essential transaction operations (deposit, withdrawal, transfer). Built with **Node.js**, **TypeScript**, **Express**, and **Prisma ORM**, the project ensures reliability with extensive unit tests using **Jest**.




## Features

*   **Customer Management**

    *   Customer registration with automatic account creation
    *   Secure login with JWT (access & refresh tokens)

*   **Account Management**

    *   Automatic account number generation
    *   Account balance and currency tracking

*   **Transactions**

    *   Deposit and withdrawal functionality
    *   Fund transfers between accounts
    *   Comprehensive transaction history
    *   Paginated transaction listing

*   **Security**

    *   Secure password hashing with `HashService`
    *   JWT authentication and token management with `TokenService`

---

## Technologies Used

*   Node.js & TypeScript
*   Express.js for building REST APIs
*   Prisma ORM with PostgreSQL (or any relational DB) for data persistence
*   Jest for comprehensive unit testing
*   Custom Security Utilities: `HashService` (password hashing), `TokenService` (JWT management)
*   Standardized Error Handling: `ApiError`
*   Testing & Async Handling: `Jest` (unit testing), `Asyncly` (async error wrapper)

---

## Installation

1.  Clone the repository:

```bash
git clone https://github.com/thablackcodes/gresh-finance.git
cd gresh finance
```

2.  Install dependencies:

```bash
npm install
```

3.  Set up the database with Prisma (ensure your `.env` is configured first):

```bash
npx prisma migrate dev --name init
```

---

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
NODE_ENV=development
PORT=3000

DATABASE_URL="postgresql://user:password@localhost:5432/gresh_finance_db"

JWT_SECRET="supersecretkeyforjwt"
JWT_REFRESH_SECRET="anothersupersecretkeyforjwtrefresh"
ACCESS_TOKEN_EXPIRATION="1h"
REFRESH_TOKEN_EXPIRATION="7d"

HASH_SALT_ROUNDS=10
```

---

## Running Tests

Run all unit tests:

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

*   Jest automatically discovers `*.test.ts` files.
*   Tests cover **both success and error cases** to ensure robust functionality.

---

## Mocking Strategy

*   **Prisma**: Fully mocked to prevent actual database interactions during tests.
*   **HashService**: Mocked for consistent password hashing/comparison results in tests.
*   **TokenService**: Mocked for reliable JWT token generation and verification during tests.
*   **httpStatus**: Mocked for consistent HTTP status code responses in tests.
*   **ApiError**: Mocked to simulate and test error propagation and handling.
*   **Asyncly wrapper**: Mocked for consistent async error handling during tests.

---

## Error Handling

All errors are handled using the **`ApiError`** class, ensuring consistent and predictable responses:

```ts
throw new ApiError(httpStatus.BAD_REQUEST, "Error message");
```

*   HTTP status codes are consistent across all services.
*   Validation, authentication, and database errors are handled distinctly.

---

## Notes

*   All tests are **unit tests**; no real database or external service calls are made.
*   Async operations are wrapped in a mock **`Asyncly`** wrapper to properly catch errors in tests.
*   Logging (`logger`) is mocked during tests to maintain clean console output.
*   The project is designed to ensure **full coverage** for both success and failure paths, maximizing reliability.

---

**Author:** Chinonso Emezue
**Date:** 2025-09-04
