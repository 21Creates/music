/*
# Remove duplicate admin_update_premium_feature function

## Summary
Drops the old 3-parameter version of `admin_update_premium_feature` so only the
new 5-parameter version (with optional p_label and p_description) remains.
Having both signatures can cause ambiguity in RPC resolution.

## Changes
1. DROP the old `admin_update_premium_feature(text, text, boolean)` function
2. The replacement `admin_update_premium_feature(text, text, boolean, text, text)`
   already exists from migration 016 and retains correct grants.
*/

DROP FUNCTION IF EXISTS admin_update_premium_feature(text, text, boolean);
