# Database Independence

The application must never depend conceptually on a specific database.

Supabase is only the current Persistence Provider.

The architecture must always allow migration to:

- PostgreSQL
- SQL Server
- MySQL
- Oracle
- MongoDB
- Firebase
- REST APIs
- GraphQL
- Local Storage
- Offline Storage

Business Modules must never know the Persistence Provider.

The Core must preserve provider independence.

Always think in abstractions.

Never introduce provider-specific business logic.