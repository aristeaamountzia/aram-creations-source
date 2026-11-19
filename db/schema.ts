import { pgTable, text, integer } from 'drizzle-orm/pg-core';
export const artistProfile = pgTable('artist_profile', {
  id: integer('id').primaryKey(),
  biography: text('biography').notNull().default(''),
  cvKey: text('cv_key'),
  cvName: text('cv_name'),
});
