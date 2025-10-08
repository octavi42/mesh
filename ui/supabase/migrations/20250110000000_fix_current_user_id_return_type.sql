-- Fix current_user_id to properly handle TEXT comparison with UUID columns

-- Drop existing policies that use current_user_id
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Project admins can add members" ON public.members;

-- Recreate "Users can create projects" policy with proper type casting
CREATE POLICY "Users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (public.current_user_id()::TEXT = created_by::TEXT);

-- Recreate "Project admins can add members" policy
-- This one was broken with self-referencing issue, fixing it properly
CREATE POLICY "Project admins can add members"
  ON public.members FOR INSERT
  WITH CHECK (
    -- Allow if creator of the project
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = members.project_id
      AND public.current_user_id()::TEXT = p.created_by::TEXT
    )
    OR
    -- Allow if already an admin
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.project_id = members.project_id
      AND public.current_user_id()::TEXT = m.user_id::TEXT
      AND m.role = 'admin'
    )
  );
