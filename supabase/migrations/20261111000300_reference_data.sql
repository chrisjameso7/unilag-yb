-- Reference data: University of Lagos faculties and departments.
-- Generated from src/lib/university.ts (source: https://unilag.edu.ng/faculties/, reviewed 2026-11-09).
-- Idempotent: safe to re-run; admins can relabel rows afterwards.

insert into public.faculties (name, slug, sort_order) values
  ('Arts', 'arts', 0),
  ('Basic Medical Sciences', 'basic-medical-sciences', 1),
  ('Clinical Sciences', 'clinical-sciences', 2),
  ('Dental Sciences', 'dental-sciences', 3),
  ('Education', 'education', 4),
  ('Engineering', 'engineering', 5),
  ('Environmental Sciences', 'environmental-sciences', 6),
  ('Law', 'law', 7),
  ('Management Sciences', 'management-sciences', 8),
  ('Pharmacy', 'pharmacy', 9),
  ('Science', 'science', 10),
  ('Social Sciences', 'social-sciences', 11)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into public.departments (faculty_id, name, slug, sort_order)
select f.id, d.name, d.slug, d.sort_order
from (values
  ('arts', 'Creative Arts', 'creative-arts', 0),
  ('arts', 'English', 'english', 1),
  ('arts', 'European Languages and Integration Studies', 'european-languages', 2),
  ('arts', 'History and Strategic Studies', 'history', 3),
  ('arts', 'Linguistics, African and Asian Studies', 'linguistics', 4),
  ('arts', 'Philosophy', 'philosophy', 5),
  ('arts', 'Religious Studies', 'religious-studies', 6),
  ('basic-medical-sciences', 'Anatomy', 'anatomy', 0),
  ('basic-medical-sciences', 'Medical Biochemistry', 'medical-biochemistry', 1),
  ('basic-medical-sciences', 'Pharmacology', 'pharmacology', 2),
  ('basic-medical-sciences', 'Physiology', 'physiology', 3),
  ('clinical-sciences', 'Medicine and Surgery', 'medicine-and-surgery', 0),
  ('dental-sciences', 'Dentistry', 'dentistry', 0),
  ('education', 'Arts and Social Science Education', 'arts-social-science-education', 0),
  ('education', 'Educational Foundations', 'educational-foundations', 1),
  ('education', 'Educational Management', 'educational-management', 2),
  ('education', 'Human Kinetics and Health Education', 'human-kinetics', 3),
  ('education', 'Science and Technology Education', 'science-technology-education', 4),
  ('engineering', 'Chemical Engineering', 'chemical-engineering', 0),
  ('engineering', 'Civil and Environmental Engineering', 'civil-engineering', 1),
  ('engineering', 'Computer Engineering', 'computer-engineering', 2),
  ('engineering', 'Electrical and Electronics Engineering', 'electrical-engineering', 3),
  ('engineering', 'Mechanical Engineering', 'mechanical-engineering', 4),
  ('engineering', 'Metallurgical and Materials Engineering', 'metallurgical-engineering', 5),
  ('engineering', 'Petroleum and Gas Engineering', 'petroleum-engineering', 6),
  ('engineering', 'Surveying and Geoinformatics', 'surveying-geoinformatics', 7),
  ('engineering', 'Systems Engineering', 'systems-engineering', 8),
  ('environmental-sciences', 'Architecture', 'architecture', 0),
  ('environmental-sciences', 'Building', 'building', 1),
  ('environmental-sciences', 'Estate Management', 'estate-management', 2),
  ('environmental-sciences', 'Quantity Surveying', 'quantity-surveying', 3),
  ('environmental-sciences', 'Urban and Regional Planning', 'urban-regional-planning', 4),
  ('law', 'Law', 'law', 0),
  ('management-sciences', 'Accounting', 'accounting', 0),
  ('management-sciences', 'Actuarial Science and Insurance', 'actuarial-science', 1),
  ('management-sciences', 'Business Administration', 'business-administration', 2),
  ('management-sciences', 'Finance', 'finance', 3),
  ('management-sciences', 'Industrial Relations and Human Resource Management', 'industrial-relations', 4),
  ('pharmacy', 'Pharmacy', 'pharmacy', 0),
  ('pharmacy', 'Pharmaceutical Chemistry', 'pharmaceutical-chemistry', 1),
  ('pharmacy', 'Pharmaceutics and Pharmaceutical Technology', 'pharmaceutics', 2),
  ('pharmacy', 'Pharmacognosy', 'pharmacognosy', 3),
  ('science', 'Biochemistry', 'biochemistry', 0),
  ('science', 'Botany', 'botany', 1),
  ('science', 'Cell Biology and Genetics', 'cell-biology-genetics', 2),
  ('science', 'Chemistry', 'chemistry', 3),
  ('science', 'Computer Science', 'computer-science', 4),
  ('science', 'Geology', 'geology', 5),
  ('science', 'Geophysics', 'geophysics', 6),
  ('science', 'Marine Sciences', 'marine-sciences', 7),
  ('science', 'Mathematics', 'mathematics', 8),
  ('science', 'Microbiology', 'microbiology', 9),
  ('science', 'Physics', 'physics', 10),
  ('science', 'Statistics', 'statistics', 11),
  ('science', 'Zoology', 'zoology', 12),
  ('social-sciences', 'Economics', 'economics', 0),
  ('social-sciences', 'Geography', 'geography', 1),
  ('social-sciences', 'Mass Communication', 'mass-communication', 2),
  ('social-sciences', 'Political Science', 'political-science', 3),
  ('social-sciences', 'Psychology', 'psychology', 4),
  ('social-sciences', 'Social Work', 'social-work', 5),
  ('social-sciences', 'Sociology', 'sociology', 6)
) as d (faculty_slug, name, slug, sort_order)
join public.faculties f on f.slug = d.faculty_slug
on conflict (faculty_id, slug) do update set name = excluded.name, sort_order = excluded.sort_order;
(node:791) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///home/claude/unilag-yb/src/lib/university.ts is not specified and it doesn't parse as CommonJS.
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to /home/claude/unilag-yb/package.json.
(Use `node --trace-warnings ...` to show where the warning was created)

-- Site content (reviewed institutional facts and archive settings).
insert into public.site_content (key, value, source_url, last_reviewed) values
  ('university.founded', '1962', 'https://unilag.edu.ng/about/', '2026-11-09'),
  ('university.motto', 'In Deed and In Truth', 'https://unilag.edu.ng/about/', '2026-11-09'),
  ('university.history',
   'The University of Lagos was established in 1962 by an Act of the Federal Parliament. It opened with a handful of students on a stretch of land beside the Lagos lagoon at Akoka, and has grown into one of Nigeria''s largest universities, with three campuses and twelve faculties. Its motto is “In Deed and In Truth.”',
   'https://unilag.edu.ng/unilag-historical-odyssey/', '2026-11-09'),
  ('university.campuses',
   'Akoka is the main campus, on the lagoon. Idi-Araba is home to the College of Medicine. Yaba hosts the School of Radiography.',
   'https://unilag.edu.ng/campus/', '2026-11-09'),
  ('university.disclaimer',
   'UNILAG Yearbook is an independent, student-focused project. It is not an official publication of the University of Lagos and is not endorsed by the university. Names, departments and years are supplied by students; the university does not verify them for this archive.',
   null, '2026-11-09'),
  ('archive.entry_fee_kobo', '299900', null, '2026-11-09'),
  ('archive.philosophy', 'Every student has a place in the story.', null, '2026-11-09'),
  ('faces.consent_version', 'faces-consent-v1', null, '2026-11-11')
on conflict (key) do nothing;
