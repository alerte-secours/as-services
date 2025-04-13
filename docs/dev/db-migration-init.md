# create init-migration from dev db

## remove all other migrations

```sh
rm -rf ./services/hasura/migrations/default/*
```

## dump

### Option 1: hasura dump api
```sh
curl -X POST http://localhost:4201/v1alpha1/pg_dump -H "Content-Type: application/json" -H "X-Hasura-Role: admin" -H "X-Hasura-Admin-Secret: admin" -d '{
  "opts": ["-O", "-x", "--schema-only", "--schema", "public"],
  "clean_output": true,
  "source": "default"
}' --output init_migration.sql
export PGUSER=dev
export PGPASSWORD=dev
export PGDATABASE=dev
export PGHOST=localhost
export PGPORT=4204
pg_dump --data-only --inserts -t 'public.enum_*' | sed -n '/^INSERT INTO /p' >> init_migration.sql
pg_dump --data-only --inserts -t 'public.external_public_config' | sed -n '/^INSERT INTO /p' >> init_migration.sql
```

### Option 2: old school dump (doesn't seem to work when apply migration, or it was only the old enum_* part)
```sh
export PGUSER=dev
export PGPASSWORD=dev
export PGDATABASE=dev
export PGHOST=localhost
export PGPORT=4204
pg_dump -n public -s > init_migration.sql
pg_dump --data-only -t 'public.enum_*' >> init_migration.sql
pg_dump --data-only -t 'public.external_public_config' >> init_migration.sql
```

## save the dump as migration

```sh
migration_timestamp="$(date '+%s')000"
migration_dir="./services/hasura/migrations/default/${migration_timestamp}_init"
mkdir $migration_dir
touch "$migration_dir/down.sql"
mv init_migration.sql "$migration_dir/up.sql"
```

## up hasura

```sh
cd "services/hasura"
hasura migrate apply --version $migration_timestamp --skip-execution --endpoint http://localhost:4201 --admin-secret admin
```
