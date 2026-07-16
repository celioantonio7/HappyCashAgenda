-- Create function to validate that a given email and phone belong to the same user.
-- This is used in the "forgot password" flow to avoid sending reset links when the phone does not match the email.

create or replace function public.verify_email_phone(p_email text, p_phone text)
returns text
language plpgsql
security definer
as $function$
declare
  user_id uuid;
  stored_phone text;
begin
  select id
  into user_id
  from auth.users
  where email = p_email
  limit 1;

  if user_id is null then
    return 'email_not_found';
  end if;

  select phone
  into stored_phone
  from public.profiles
  where id = user_id
  limit 1;

  if stored_phone is null then
    return 'phone_not_found';
  end if;

  if regexp_replace(stored_phone, '\D', '', 'g') != regexp_replace(p_phone, '\D', '', 'g') then
    return 'mismatch';
  end if;

  return 'ok';
end;
$function$;

-- Allow anonymous users to call this helper in the password recovery flow.
grant execute on function public.verify_email_phone(text, text) to anon;
