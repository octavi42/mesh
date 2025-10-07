-- Add current logged-in user to the default project so they can access chats
INSERT INTO public.members (project_id, user_id, role)
VALUES ('11111111-1111-1111-1111-111111111111', 'X1Wqr4eYWdkOYVzHQUgxiVDmjoMTAflw', 'admin')
ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'admin';

-- Make sure the default project exists
INSERT INTO public.projects (id, name, created_by)
VALUES ('11111111-1111-1111-1111-111111111111', 'Default Project', 'X1Wqr4eYWdkOYVzHQUgxiVDmjoMTAflw')
ON CONFLICT (id) DO NOTHING;

-- Add the chat if it doesn't exist
INSERT INTO public.chats (id, project_id, name, created_by)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Project Planning Discussion', 'X1Wqr4eYWdkOYVzHQUgxiVDmjoMTAflw')
ON CONFLICT (id) DO NOTHING;

SELECT 'User added successfully!' as result;
