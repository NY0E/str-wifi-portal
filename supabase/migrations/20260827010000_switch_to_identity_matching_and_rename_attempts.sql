-- Hospitable's public API doesn't expose the smart-lock door code (verified
-- live: not on the reservation/property objects, no working `include=`
-- variant, not in message content). Airbnb also doesn't share guest email
-- via the API. Switched guest verification to last name + last 4 digits of
-- the phone number on the reservation instead, and split the "signature"
-- (whoever is actually filling out the form, which may not be the primary
-- reservation holder) into its own name + email fields.

alter table house_rules_acceptances
  drop column door_code_used,
  add column reservation_last_name text not null,
  add column reservation_phone_last4 text not null,
  add column signer_name text not null;

alter table door_code_attempts rename to auth_attempts;
