
-- Wipe all existing users (cascades to profiles)
DELETE FROM auth.users;

-- Helper: seed user + profile
DO $$
DECLARE
  s1 uuid := gen_random_uuid();
  s2 uuid := gen_random_uuid();
  m1 uuid := gen_random_uuid();
  m2 uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change_token_new, email_change)
  VALUES
    (s1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student1@med.uz', crypt('123456', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
    (s2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student2@med.uz', crypt('123456', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
    (m1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mentor1@med.uz', crypt('123456', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', ''),
    (m2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mentor2@med.uz', crypt('123456', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', '', '', '', '');

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), s1, s1::text, jsonb_build_object('sub', s1::text, 'email', 'student1@med.uz'), 'email', now(), now(), now()),
    (gen_random_uuid(), s2, s2::text, jsonb_build_object('sub', s2::text, 'email', 'student2@med.uz'), 'email', now(), now(), now()),
    (gen_random_uuid(), m1, m1::text, jsonb_build_object('sub', m1::text, 'email', 'mentor1@med.uz'), 'email', now(), now(), now()),
    (gen_random_uuid(), m2, m2::text, jsonb_build_object('sub', m2::text, 'email', 'mentor2@med.uz'), 'email', now(), now(), now());

  INSERT INTO public.profiles (id, role, full_name, city, specialty, university, year_of_study, languages, hospital, years_experience, license_number)
  VALUES
    (s1, 'student', 'Aziz Karimov', 'Tashkent', 'Cardiology', 'Tashkent Medical Academy', 3, 'Uzbek, English', NULL, NULL, NULL),
    (s2, 'student', 'Madina Yusupova', 'Samarkand', 'Pediatrics', 'Samarkand State Medical University', 2, 'Uzbek, Russian', NULL, NULL, NULL),
    (m1, 'mentor', 'Dr. Rustam Abdullaev', 'Tashkent', 'Surgery', NULL, NULL, NULL, 'Republican Clinical Hospital', 12, 'UZ-MED-10234'),
    (m2, 'mentor', 'Dr. Nilufar Saidova', 'Tashkent', 'Pediatrics', NULL, NULL, NULL, 'National Children''s Medical Center', 9, 'UZ-MED-20871');
END $$;
