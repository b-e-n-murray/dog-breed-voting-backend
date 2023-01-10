DROP TABLE IF EXISTS votes;

CREATE TABLE  votes (
    id          serial PRIMARY KEY,
    breedName   text not null,
    score integer default 0
);

INSERT INTO votes (breedName) VALUES ('api.name')

