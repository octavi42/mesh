-- Clear existing data
TRUNCATE public.messages CASCADE;
TRUNCATE public.chats CASCADE;
TRUNCATE public.members CASCADE;
TRUNCATE public.projects CASCADE;
TRUNCATE public.users CASCADE;

-- Insert test users (these will be linked when Better Auth users sign up)
INSERT INTO public.users (id, email, display_name, avatar_url) VALUES
  ('test-user-1', 'test1@example.com', 'Test User 1', 'https://api.dicebear.com/7.x/avataaars/svg?seed=test1'),
  ('test-user-2', 'test2@example.com', 'Test User 2', 'https://api.dicebear.com/7.x/avataaars/svg?seed=test2'),
  ('test-user-3', 'test3@example.com', 'Test User 3', 'https://api.dicebear.com/7.x/avataaars/svg?seed=test3')
ON CONFLICT (id) DO NOTHING;

-- Insert projects (using UUIDs)
INSERT INTO public.projects (id, name, created_by) VALUES
  ('11111111-1111-1111-1111-111111111111', 'TeamZ Dashboard', 'test-user-1'),
  ('22222222-2222-2222-2222-222222222222', 'Mobile App', 'test-user-1'),
  ('33333333-3333-3333-3333-333333333333', 'API Gateway', 'test-user-2')
ON CONFLICT (id) DO NOTHING;

-- Insert project members (this is critical!)
-- Project 1: All three users
INSERT INTO public.members (user_id, project_id, role) VALUES
  ('test-user-1', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('test-user-2', '11111111-1111-1111-1111-111111111111', 'member'),
  ('test-user-3', '11111111-1111-1111-1111-111111111111', 'member')
ON CONFLICT (user_id, project_id) DO NOTHING;

-- Project 2: User 1 and User 2
INSERT INTO public.members (user_id, project_id, role) VALUES
  ('test-user-1', '22222222-2222-2222-2222-222222222222', 'admin'),
  ('test-user-2', '22222222-2222-2222-2222-222222222222', 'member')
ON CONFLICT (user_id, project_id) DO NOTHING;

-- Project 3: User 2 and User 3
INSERT INTO public.members (user_id, project_id, role) VALUES
  ('test-user-2', '33333333-3333-3333-3333-333333333333', 'admin'),
  ('test-user-3', '33333333-3333-3333-3333-333333333333', 'member')
ON CONFLICT (user_id, project_id) DO NOTHING;

-- Insert chats for Project 1 (using UUIDs)
INSERT INTO public.chats (id, project_id, name, created_by) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Project Planning Discussion', 'test-user-1'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'UI/UX Review', 'test-user-1'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Bug Fixes & Updates', 'test-user-2'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'Team Standup Notes', 'test-user-1')
ON CONFLICT (id) DO NOTHING;

-- Insert chats for Project 2
INSERT INTO public.chats (id, project_id, name, created_by) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 'iOS Development', 'test-user-1'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', 'Android Development', 'test-user-2')
ON CONFLICT (id) DO NOTHING;

-- Insert chats for Project 3
INSERT INTO public.chats (id, project_id, name, created_by) VALUES
  ('00000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'API Design', 'test-user-2'),
  ('00000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Authentication', 'test-user-2')
ON CONFLICT (id) DO NOTHING;

-- Insert sample messages for chat aaaaaaaa (Project Planning Discussion)
INSERT INTO public.messages (chat_id, user_id, content, is_llm_message, created_at) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'test-user-1', 'Hey team! Ready to discuss the Q1 roadmap?', false, now() - interval '10 minutes'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'Absolutely! I can help organize the discussion. What are the key priorities for Q1?', true, now() - interval '9 minutes'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'test-user-1', 'We need to focus on messaging and user profiles', false, now() - interval '8 minutes'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'test-user-2', 'I agree, those are critical features', false, now() - interval '7 minutes'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'test-user-3', 'Should we also consider mobile optimization?', false, now() - interval '6 minutes');

-- Insert sample messages for chat bbbbbbbb (UI/UX Review)
INSERT INTO public.messages (chat_id, user_id, content, is_llm_message, created_at) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'test-user-1', 'The new UI mockups look great!', false, now() - interval '30 minutes'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', null, 'Thank you! What specific aspects would you like to discuss?', true, now() - interval '29 minutes'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'test-user-2', 'I really like the color scheme', false, now() - interval '28 minutes');

-- Insert sample messages for chat eeeeeeee (iOS Development)
INSERT INTO public.messages (chat_id, user_id, content, is_llm_message, created_at) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'test-user-1', 'Starting work on the iOS app', false, now() - interval '2 hours'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'test-user-2', 'Let me know if you need any help', false, now() - interval '1 hour');

-- Insert sample messages for chat 00000000-0000-0000-0000-000000000001 (API Design)
INSERT INTO public.messages (chat_id, user_id, content, is_llm_message, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'test-user-2', 'Designing the REST API endpoints', false, now() - interval '3 hours'),
  ('00000000-0000-0000-0000-000000000001', 'test-user-3', 'Should we use GraphQL instead?', false, now() - interval '2 hours 30 minutes');

-- Verification queries
SELECT 'Projects' as table_name, COUNT(*) as count FROM public.projects
UNION ALL
SELECT 'Users', COUNT(*) FROM public.users
UNION ALL
SELECT 'Members', COUNT(*) FROM public.members
UNION ALL
SELECT 'Chats', COUNT(*) FROM public.chats
UNION ALL
SELECT 'Messages', COUNT(*) FROM public.messages;
