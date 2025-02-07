\echo 'Delete and recreate pet_social db?'
\prompt 'Return for yes or control-C to cancel > ' foo

DROP DATABASE pet_social;
CREATE DATABASE pet_social;
\connect pet_social

\i pet-social-schema.sql
\i pet-social-seed.sql

\echo 'Delete and recreate pet_social_test db?'
\prompt 'Return for yes or control-C to cancel > ' foo

DROP DATABASE pet_social_test;
CREATE DATABASE pet_social_test;
\connect pet_social_test

\i pet-social-schema.sql
