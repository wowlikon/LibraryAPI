.PHONY: help build up start down destroy stop restart logs db-shell

help:
	@echo "Available commands:"
	@echo "  make build       - Build the Docker images"
	@echo "  make up          - Start the containers"
	@echo "  make down        - Stop and remove the containers"
	@echo "  make db-shell    - Access the database shell"

build:
	docker-compose -f docker-compose.yml build

up:
	docker-compose -f docker-compose.yml up -d

down:
	docker-compose -f docker-compose.yml down

db-shell:
	docker-compose -f docker-compose.yml exec timescale psql -Upostgres
