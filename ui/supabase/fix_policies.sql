-- Drop all existing policies on members table
DROP POLICY IF EXISTS "Users can view members of their projects" ON public.members;
DROP POLICY IF EXISTS "Project admins can add members" ON public.members;
DROP POLICY IF EXISTS "Project admins can update member roles" ON public.members;
DROP POLICY IF EXISTS "Project admins can remove members" ON public.members;

-- Recreate policies without infinite recursion
-- Allow users to view members of projects they belong to
CREATE POLICY "Users can view members of their projects"
  ON public.members FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    project_id IN (
      SELECT project_id
      FROM public.members
      WHERE user_id = auth.uid()
    )
  );

-- Allow project admins to add members
CREATE POLICY "Project admins can add members"
  ON public.members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.project_id = members.project_id
      AND m.user_id = auth.uid()
      AND m.role = 'admin'
    )
  );

-- Allow project admins to update member roles
CREATE POLICY "Project admins can update member roles"
  ON public.members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.project_id = members.project_id
      AND m.user_id = auth.uid()
      AND m.role = 'admin'
      AND m.id != members.id  -- Prevent self-reference
    )
  );

-- Allow project admins to remove members
CREATE POLICY "Project admins can remove members"
  ON public.members FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.members m
      WHERE m.project_id = members.project_id
      AND m.user_id = auth.uid()
      AND m.role = 'admin'
      AND m.id != members.id  -- Prevent self-reference
    )
  );
