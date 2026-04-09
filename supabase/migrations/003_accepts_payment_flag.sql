-- ============================================
-- 003: accepts_payment public flag
-- ============================================
-- Idempotent: safe to re-run.
--
-- Why:
--   profile_private is RLS-locked to the owner, so non-owners loading a
--   profile cannot see whether payout has been configured. The feedback
--   request modal needs this signal (to know if paid plans should be
--   enabled) without exposing the actual payout credentials.
--
-- Fix:
--   Public boolean flag on profiles, kept in sync by a trigger on
--   profile_private. Actual payout data stays private.

alter table profiles add column if not exists accepts_payment boolean not null default false;

create or replace function sync_accepts_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set accepts_payment = (
    new.payout_method is not null
    and (
      (new.payout_method = 'paypal' and new.paypal_email is not null and new.paypal_email <> '')
      or (new.payout_method = 'bank' and new.bank_info is not null and new.bank_info <> '')
    )
  )
  where email = new.email;
  return new;
end $$;

drop trigger if exists profile_private_sync_accepts_payment on profile_private;
create trigger profile_private_sync_accepts_payment
  after insert or update on profile_private
  for each row execute function sync_accepts_payment();

-- Backfill from existing rows
update profiles p
set accepts_payment = (
  pp.payout_method is not null
  and (
    (pp.payout_method = 'paypal' and pp.paypal_email is not null and pp.paypal_email <> '')
    or (pp.payout_method = 'bank' and pp.bank_info is not null and pp.bank_info <> '')
  )
)
from profile_private pp
where p.email = pp.email;
