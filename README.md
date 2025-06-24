# LibraryAPI

This project is a test web application built using FastAPI, a modern web framework for creating APIs in Python. It showcases the use of Pydantic for data validation, SQLModel for database interactions, Alembic for migration management, PostgreSQL as the database system, and Docker Compose for easy deployment.

### **Key Components:**

1. FastAPI: Provides high performance and simplicity for developing RESTful APIs, supporting asynchronous operations and automatic documentation generation.
2. Pydantic: Used for data validation and serialization, allowing easy definition of data schemas.
3. SQLModel: Combines SQLAlchemy and Pydantic, enabling database operations with Python classes.
4. Alembic: A tool for managing database migrations, making it easy to track and apply changes to the database schema.
5. PostgreSQL: A reliable relational database used for data storage.
6. Docker Compose: Simplifies the deployment of the application and its dependencies in containers.


### **Installation Instructions**

For development:

1. Clone the repository:
   ```bash
   git clone https://github.com/wowlikon/libraryapi.git
   ```

2. Navigate to the project directory:
   ```bash
   cd libraryapi
   ```

3. Configure environment variables:
   ```bash
   edit .env
   ```

4. Build the Docker containers:
   ```bash
   docker compose build
   ```

5. Run the application:
   ```bash
   docker compose up api
   ```

For make new migrations:
   ```bash
   docker compose run --rm -T api alembic revision --autogenerate -m "Migration name"
   ```

For run tests:
   ```bash
   docker compose up test
   ```

### **API Endpoints**

**Authors**
| Method | Endpoint              | Description                                    |
|--------|-----------------------|------------------------------------------------|
| POST   | `/authors`            | Create a new author                            |
| GET    | `/authors`            | Retrieve a list of all authors                 |
| GET    | `/authors/{id}`       | Retrieve a specific author by ID with books    |
| PUT    | `/authors/{id}`       | Update a specific author by ID                 |
| DELETE | `/authors/{id}`       | Delete a specific author by ID                 |
| GET    | `/authors/{id}/books` | Retrieve a list of books for a specific author |

**Books**
| Method | Endpoint              | Description                                    |
|--------|-----------------------|------------------------------------------------|
| POST   | `/books`              | Create a new book                              |
| GET    | `/books`              | Retrieve a list of all books                   |
| GET    | `/book/{id}`          | Retrieve a specific book by ID with authors    |
| PUT    | `/books/{id}`         | Update a specific book by ID                   |
| DELETE | `/books/{id}`         | Delete a specific book by ID                   |
| GET    | `/books/{id}/authors` | Retrieve a list of authors for a specific book |

**Relationships**
| Method | Endpoint              | Description                                    |
|--------|-----------------------|------------------------------------------------|
| GET    | `/relationships`      | Retrieve a list of all relationships           |
| POST   | `/relationships`      | Add author-book relationship                   |
| DELETE | `/relationships`      | Remove author-book relationship                |


### **Technologies Used**

- **FastAPI**: A modern web framework for building APIs with Python, known for its speed and ease of use.
- **Pydantic**: A data validation and settings management library that uses Python type annotations.
- **SQLModel**: A library for interacting with databases using Python classes, combining the features of SQLAlchemy and Pydantic.
- **Alembic**: A lightweight database migration tool for use with SQLAlchemy.
- **PostgreSQL**: A powerful, open-source relational database management system.
- **Docker**: A platform for developing, shipping, and running applications in containers.
- **Docker Compose**: A tool for defining and running multi-container Docker applications.


### **TODO List**

- Geners table and endpoints
