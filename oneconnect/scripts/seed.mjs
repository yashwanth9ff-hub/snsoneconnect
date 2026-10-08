// Seeds departments, request types, demo users and demo content.
// Safe to run again: it also RESETS all requests, notifications, announcements and events
// to a clean demo state (use it before every demo).
//   npm run seed
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const PASSWORD = 'Demo@12345';
const DAY = 86400000;
const HOUR = 3600000;
const inFuture = (ms) => new Date(Date.now() + ms).toISOString();
const inPast = (ms) => new Date(Date.now() - ms).toISOString();

async function ok(promise, label) {
  const { data, error } = await promise;
  if (error) {
    console.error(`FAILED: ${label}\n  ${error.message}`);
    process.exit(1);
  }
  return data;
}

// 1. Departments
const deptRows = await ok(
  admin.from('departments').upsert(
    [
      { code: 'CSE', name: 'Computer Science and Engineering' },
      { code: 'IT', name: 'Information Technology' },
      { code: 'ECE', name: 'Electronics and Communication Engineering' },
      { code: 'MECH', name: 'Mechanical Engineering' },
      { code: 'OFFICE', name: 'Administrative Office' },
    ],
    { onConflict: 'code' }
  ).select(),
  'departments'
);
const dept = Object.fromEntries(deptRows.map((d) => [d.code, d.id]));

// 2. Request types
const typeRows = await ok(
  admin.from('request_types').upsert(
    [
      {
        name: 'Bonafide Certificate',
        description: 'Proof of enrolment for scholarships, bank or passport use. Usually ready in 2 working days.',
        routing: 'fixed',
        default_department_id: dept.OFFICE,
      },
      {
        name: 'ID Card Replacement',
        description: 'Replace a lost or damaged ID card. Usually ready in 3 working days.',
        routing: 'fixed',
        default_department_id: dept.OFFICE,
      },
      {
        name: 'Lab Access Permission',
        description: 'Ask your department for lab access outside class hours.',
        routing: 'student_dept',
        default_department_id: null,
      },
    ],
    { onConflict: 'name' }
  ).select(),
  'request types'
);
const rtype = Object.fromEntries(typeRows.map((t) => [t.name, t.id]));

// 3. Demo users (created through the Auth admin API, then given a profile)
const existing = await ok(admin.auth.admin.listUsers({ page: 1, perPage: 1000 }), 'list users');
const byEmail = Object.fromEntries(existing.users.map((u) => [u.email, u.id]));

const people = [
  { email: 'student1@oneconnect.demo', full_name: 'Arun Kumar',   role: 'student', dept: 'CSE', year: 3, register_no: '727722EUCS001' },
  { email: 'student2@oneconnect.demo', full_name: 'Divya Shree',  role: 'student', dept: 'CSE', year: 3, register_no: '727722EUCS002' },
  { email: 'student3@oneconnect.demo', full_name: 'Karthik S',    role: 'student', dept: 'CSE', year: 3, register_no: '727722EUCS003' },
  { email: 'student4@oneconnect.demo', full_name: 'Meena R',      role: 'student', dept: 'IT',  year: 2, register_no: '727723EUIT004' },
  { email: 'faculty@oneconnect.demo',  full_name: 'Dr. Priya Nair', role: 'faculty', dept: 'CSE' },
  { email: 'admin@oneconnect.demo',    full_name: 'Rajesh Kannan (Office)', role: 'admin', dept: 'OFFICE' },
];

const uid = {};
for (const p of people) {
  let id = byEmail[p.email];
  if (!id) {
    const created = await ok(
      admin.auth.admin.createUser({ email: p.email, password: PASSWORD, email_confirm: true }),
      `create user ${p.email}`
    );
    id = created.user.id;
  }
  uid[p.email] = id;
  await ok(
    admin.from('profiles').upsert({
      id,
      full_name: p.full_name,
      email: p.email,
      role: p.role,
      department_id: dept[p.dept],
      year: p.year ?? null,
      register_no: p.register_no ?? null,
      is_active: true,
    }),
    `profile ${p.email}`
  );
}
const faculty = uid['faculty@oneconnect.demo'];
const office = uid['admin@oneconnect.demo'];

// 4. Reset transactional data
const notNull = (q) => q.not('id', 'is', null);
await ok(notNull(admin.from('notifications').delete()), 'clear notifications');
await ok(notNull(admin.from('request_status_history').delete()), 'clear history');
await ok(notNull(admin.from('requests').delete()), 'clear requests');
await ok(notNull(admin.from('events').delete()), 'clear events');
await ok(notNull(admin.from('announcements').delete()), 'clear announcements');

// 5. Demo announcements
await ok(
  admin.from('announcements').insert([
    {
      title: 'Internal Assessment 2 timetable released',
      body: 'The timetable for Internal Assessment 2 is now final. Exams start next Monday at 9:30 AM. Carry your ID card to every session.',
      category: 'exams', target_department_id: dept.CSE, target_year: 3,
      created_by: faculty, published_at: inPast(5 * HOUR),
    },
    {
      title: 'Lab record submission',
      body: 'Submit your completed lab records for Semester 5 to the lab in-charge. Records without a signed index page will not be accepted.',
      category: 'academic', target_department_id: dept.CSE, target_year: 3,
      deadline_at: inFuture(3 * DAY), created_by: faculty, published_at: inPast(1 * DAY),
    },
    {
      title: 'Library dues clearance',
      body: 'Clear all pending library dues before the end of this week. Students with dues will not receive hall tickets.',
      category: 'admin',
      deadline_at: inFuture(5 * DAY), created_by: office, published_at: inPast(2 * DAY),
    },
    {
      title: 'Campus placement drive: registration open',
      body: 'Final-year students can register for the upcoming campus drive. Keep your updated resume ready.',
      category: 'placement', target_year: 3,
      deadline_at: inFuture(4 * DAY), created_by: office, published_at: inPast(3 * DAY),
    },
    {
      title: 'IT department technical symposium',
      body: 'Registrations are open for paper presentation and project expo. Open to all IT students.',
      category: 'events', target_department_id: dept.IT,
      created_by: faculty, published_at: inPast(1 * DAY),
    },
    {
      title: 'Holiday notice',
      body: 'The college will remain closed this Saturday for a local festival. Regular classes resume on Monday.',
      category: 'general', created_by: office, published_at: inPast(4 * DAY),
    },
  ]),
  'announcements'
);

// 6. Demo events
await ok(
  admin.from('events').insert([
    { title: 'Guest lecture: Cloud careers', description: 'Industry talk and Q&A.', venue: 'Seminar Hall 1',
      starts_at: inFuture(2 * DAY), ends_at: inFuture(2 * DAY + 2 * HOUR), target_department_id: dept.CSE, created_by: faculty },
    { title: 'Annual sports meet', description: 'Track and field events.', venue: 'Main Ground',
      starts_at: inFuture(6 * DAY), ends_at: inFuture(6 * DAY + 6 * HOUR), created_by: office },
    { title: 'IT symposium: project expo', description: 'Project demos and judging.', venue: 'IT Block, Lab 3',
      starts_at: inFuture(9 * DAY), target_department_id: dept.IT, created_by: faculty },
  ]),
  'events'
);

console.log('\nSeed complete.\n');
console.log('Password for every demo account: ' + PASSWORD);
console.log(people.map((p) => `  ${p.role.padEnd(8)} ${p.email}`).join('\n'));
console.log('\nOptional: restart tracking IDs from 1 by running this in the SQL editor:');
console.log('  alter sequence public.request_seq restart with 1;\n');
