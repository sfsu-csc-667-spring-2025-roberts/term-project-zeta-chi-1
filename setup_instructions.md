# Project Setup Instructions
# Press Ctrl-Shift-V in VSCode

Follow these steps to set up and run the project:

1. **Install Dependencies**

   Run the following command to install all necessary packages:

   ```bash
   npm install
   ```

2. **Initialize TypeScript Configuration**

   If the file `tsconfig.json` **does not already exist**, initialize it with the following command:

   ```bash
   npx tsc --init --rootDir src --outDir dist --esModuleInterop --resolveJsonModule --lib es6 --module commonjs --allowJs true --noImplicitAny true --strict true
   ```

3. **Create the Database in PostgreSQL**

   Open your PostgreSQL terminal and run:

   ```sql
   CREATE DATABASE auth_db;
   ```

4. **Run SQL Commands in `auth_db`**  

   **Run SQL Commands in PSQL-setup.sql**

   **PSQL instructions:**

   ```bash
   psql -U postgres -d auth_db -f Filepath to psql-setup.sql
   ```

5. **Configure Environment Variables**

   Open the `.env` file and update the SQL database password to match your PostgreSQL credentials.

6. **Start the Development Server**

   Run the following command to start the server on `http://localhost:3000`:

   ```bash
   npm run uno
   ```
