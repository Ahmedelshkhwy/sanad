-- pin_failed counts a wrong PIN against a phone number and locks it after 5. Open to anon,
-- anyone could lock any member out by calling it with their number. Only the server calls
-- these two now, with the service role; pin_succeeded stays callable because it only
-- clears the caller's own phone.
revoke execute on function public.pin_allowed(text) from anon, authenticated;
revoke execute on function public.pin_failed(text) from anon, authenticated;
grant execute on function public.pin_allowed(text) to service_role;
grant execute on function public.pin_failed(text) to service_role;
