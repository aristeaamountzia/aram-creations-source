CREATE TABLE "artist_profile" (
	"id" integer PRIMARY KEY,
	"biography" text DEFAULT '' NOT NULL,
	"cv_key" text,
	"cv_name" text
);
