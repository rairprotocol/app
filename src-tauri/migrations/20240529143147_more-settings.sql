ALTER TABLE settings ADD COLUMN interface_font_size INTEGER DEFAULT 15 NOT NULL;
ALTER TABLE settings ADD COLUMN interface_scale INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE settings ADD COLUMN editor_font_size INTEGER DEFAULT 13 NOT NULL;
ALTER TABLE settings ADD COLUMN editor_soft_wrap BOOLEAN DEFAULT 1 NOT NULL;
