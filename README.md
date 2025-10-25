# Country Currency API

This is a simple API that provides data about countries, including their currency, estimated GDP, and other details.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js
- npm
- A MySQL database

### Installing

1. Clone the repo
   ```sh
   git clone https://github.com/your_username_/country-currency-api.git
   ```
2. Install NPM packages
   ```sh
   npm install
   ```
3. Create a `.env` file in the root directory and add your database URL:
   ```
   DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
   ```
4. Run the database migrations
    ```sh
    npx prisma migrate dev
    ```
5. Start the development server
   ```sh
   npm run dev
   ```

The API will be running at `http://localhost:3000`.

## API Endpoints

- `POST /countries/refresh`: Refreshes the country data from the external APIs.
- `GET /countries`: Returns a list of all countries.
  - Query parameters:
    - `region`: Filters by region.
    - `currency`: Filters by currency code.
    - `sort`: Sorts the results. Possible values: `gdp_desc`, `gdp_asc`, `name`.
- `GET /countries/image`: Returns a summary image of the top 5 countries by estimated GDP.
- `GET /countries/:name`: Returns the details of a specific country.
- `DELETE /countries/:name`: Deletes a specific country.
- `GET /status`: Returns the status of the API, including the total number of countries and the last refresh time.

## Technologies Used

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Prisma](https://www.prisma.io/)
- [TypeScript](https://www.typescriptlang.org/)
- [MySQL](https://www.mysql.com/)
