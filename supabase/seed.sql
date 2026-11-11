-- Local development seed (run by `supabase db reset`). NOT a migration: never runs in production.
-- This file is the only source of demonstration entries.
--
-- Fictional demonstration entries, flagged is_demo = true and labelled in the UI.
-- They have no owning account and no photograph (the UI renders a monogram plate).
-- No demo logins are created: make your own account and grant it a role with
-- scripts/grant-admin.mjs.

insert into public.student_profiles
  (public_identifier, username, full_name, faculty_id, department_id, admission_year,
   graduation_year, bio, graduation_status, verification_status, publication_status,
   consent_public, is_demo, published_at)
select d.public_identifier, d.username, d.full_name, f.id, dep.id, d.admission_year,
       d.graduation_year, d.bio, d.graduation_status, 'verified', 'published', true, true, now()
from (values
  ('ULY-2025-D001', 'adaeze-okonkwo', 'Adaeze Okonkwo', 'law', 'law', 2021, 2025, 'Came for the law. Stayed for the moot court drama. Left with a wig, a gown and a permanent fear of 8am.', 'graduated'),
  ('ULY-2026-D002', 'tunde-adewole', 'Tunde Adewole', 'engineering', 'computer-engineering', 2022, 2026, 'Somewhere between building things, missing lectures and figuring life out. Glad I made it here.', 'in_progress'),
  ('ULY-2027-D003', 'zainab-bello', 'Zainab Bello', 'social-sciences', 'mass-communication', 2023, 2027, 'I came to study broadcasting and ended up broadcasting my opinions to my hostel at 2am. No regrets.', 'in_progress'),
  ('ULY-2026-D004', 'chinedu-eze', 'Chinedu Eze', 'science', 'computer-science', 2022, 2026, 'My code compiles on the first try exactly once a semester. That semester was not this one.', 'in_progress'),
  ('ULY-2025-D005', 'temilade-adeyemi', 'Temilade Adeyemi', 'arts', 'english', 2021, 2025, 'Read every book on the list. Understood roughly half. Wrote about all of them with total confidence.', 'graduated'),
  ('ULY-2028-D006', 'ifeanyi-nwosu', 'Ifeanyi Nwosu', 'management-sciences', 'accounting', 2024, 2028, 'I can balance a ledger but not my timetable, my sleep, or my mother''s expectations. Working on two of three.', 'in_progress'),
  ('ULY-2027-D007', 'aisha-lawal', 'Aisha Lawal', 'basic-medical-sciences', 'physiology', 2023, 2027, 'Anatomy taught me that the human body is complicated. UNILAG taught me that so is the shuttle queue.', 'in_progress'),
  ('ULY-2026-D008', 'damilola-ogunleye', 'Damilola Ogunleye', 'environmental-sciences', 'architecture', 2022, 2026, 'Four years of drawing buildings I will never afford. Still the best studio in Lagos, though.', 'in_progress'),
  ('ULY-2026-D009', 'kelechi-umeh', 'Kelechi Umeh', 'engineering', 'mechanical-engineering', 2022, 2026, 'I fix things. Mostly my group project, at 3am, the night before submission. Ask me about thermodynamics.', 'in_progress'),
  ('ULY-2029-D010', 'folake-adebayo', 'Folake Adebayo', 'social-sciences', 'psychology', 2025, 2029, 'First year. Already analysing everybody in the lecture hall. This is going to be a long four years.', 'in_progress'),
  ('ULY-2025-D011', 'emeka-obi', 'Emeka Obi', 'science', 'microbiology', 2021, 2025, 'Spent final year in a lab with things I could not see. Somehow that was less confusing than my group chat.', 'graduated'),
  ('ULY-2024-D012', 'halima-suleiman', 'Halima Suleiman', 'pharmacy', 'pharmacy', 2020, 2024, 'Six years. Countless practicals. One very long white coat and a family that now calls me for free advice.', 'graduated'),
  ('ULY-2028-D013', 'oluwaseun-adeleke', 'Oluwaseun Adeleke', 'law', 'law', 2024, 2028, 'Objection: it is 8am, it is raining, and the shuttle is full. Sustained, your honour.', 'in_progress'),
  ('ULY-2027-D014', 'ngozi-chukwu', 'Ngozi Chukwu', 'education', 'human-kinetics', 2023, 2027, 'I spend my mornings running around the track and my afternoons running after group members. Both count as cardio.', 'in_progress'),
  ('ULY-2025-D015', 'yusuf-danjuma', 'Yusuf Danjuma', 'science', 'mathematics', 2021, 2025, 'I found a proof for something last year. I have been looking for it again since. It is somewhere in that notebook.', 'graduated'),
  ('ULY-2029-D016', 'similoluwa-ojo', 'Similoluwa Ojo', 'arts', 'creative-arts', 2025, 2029, 'I paint the lagoon because the lagoon has never once given me an assignment deadline.', 'in_progress'),
  ('ULY-2026-D017', 'chiamaka-nnadi', 'Chiamaka Nnadi', 'management-sciences', 'finance', 2022, 2026, '₦2,999 was the best return on investment I made this year. Ask me about my portfolio, not my attendance.', 'in_progress'),
  ('ULY-2027-D018', 'bilal-musa', 'Bilal Musa', 'science', 'geology', 2023, 2027, 'I can identify a rock at fifty paces. I still cannot identify where my lecture is. Science has limits.', 'in_progress'),
  ('ULY-2023-D019', 'amara-ihejirika', 'Amara Ihejirika', 'clinical-sciences', 'medicine-and-surgery', 2019, 2023, 'Seven years later, I finally know where the lecture theatre is. It is time to leave.', 'graduated'),
  ('ULY-2028-D020', 'faridah-yusuf', 'Faridah Yusuf', 'science', 'biochemistry', 2024, 2028, 'Everything in the lab smells like the future. Or possibly like the canteen next door. Hard to tell.', 'in_progress'),
  ('ULY-2026-D021', 'ikechukwu-nnamdi', 'Ikechukwu Nnamdi', 'engineering', 'petroleum-engineering', 2022, 2026, 'The course taught me that pressure is manageable. The timetable disagreed. I have learned to be careful.', 'in_progress'),
  ('ULY-2027-D022', 'sade-balogun', 'Sade Balogun', 'social-sciences', 'sociology', 2023, 2027, 'Sociology made me realise that everyone is a research participant. My roommates have not consented yet.', 'in_progress'),
  ('ULY-2024-D023', 'mubarak-salami', 'Mubarak Salami', 'dental-sciences', 'dentistry', 2020, 2024, 'I spent my twenties looking at teeth and my final year avoiding sugar. In deed and in truth: worth it.', 'graduated'),
  ('ULY-2029-D024', 'precious-etim', 'Precious Etim', 'arts', 'linguistics', 2025, 2029, 'I speak four languages and still cannot explain to my lecturer why I was late. Funny how that happens.', 'in_progress'),
  ('ULY-2025-D025', 'david-oyelaran', 'David Oyelaran', 'environmental-sciences', 'urban-regional-planning', 2021, 2025, 'I planned several cities in five years. None of them included the Akoka traffic. Back to the drawing board.', 'graduated'),
  ('ULY-2028-D026', 'kemi-alade', 'Kemi Alade', 'education', 'educational-management', 2024, 2028, 'Learning how to run a school while running to class. The irony is not lost on me.', 'in_progress'),
  ('ULY-2026-D027', 'nasir-umar', 'Nasir Umar', 'science', 'physics', 2022, 2026, 'Technically, everything is always moving. Practically, so am I. Usually towards the shuttle stop.', 'in_progress'),
  ('ULY-2029-D028', 'chinaza-ezeani', 'Chinaza Ezeani', 'management-sciences', 'business-administration', 2025, 2029, 'Joined the yearbook in first year so that, whatever happens next, there is proof I was here and hopeful.', 'in_progress')
) as d (public_identifier, username, full_name, faculty_slug, department_slug, admission_year,
        graduation_year, bio, graduation_status)
join public.faculties f on f.slug = d.faculty_slug
join public.departments dep on dep.faculty_id = f.id and dep.slug = d.department_slug
on conflict (username) do nothing;

insert into public.cohorts (year, cohort_type)
select distinct admission_year, 'admission' from public.student_profiles where publication_status = 'published'
union
select distinct graduation_year, 'graduation' from public.student_profiles where publication_status = 'published'
on conflict (year, cohort_type) do nothing;
