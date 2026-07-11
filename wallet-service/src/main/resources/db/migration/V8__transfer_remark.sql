-- V8: store the optional transfer remark (free-text note, e.g. "Rent for July").
-- Displayed in email notifications; nullable — most transfers won't have one.

ALTER TABLE transfers ADD COLUMN remark VARCHAR(500);
