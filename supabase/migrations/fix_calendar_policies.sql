-- SQL Migration: Fix RLS Policies for Calendar and Events
-- This script fixes the "Failed to create event" issue and allows admins to manage attendance.

-- 1. Redefine Events Policies
-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Members can view events" ON public.events;
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

-- Allow members to see events for their troupes
CREATE POLICY "Members can view events"
ON public.events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.troupe_members
    WHERE troupe_members.troupe_id = events.troupe_id
    AND troupe_members.user_id = auth.uid()
  )
);

-- Allow admins to create, update, and delete events
-- We use separate policies for clarity and to ensure WITH CHECK is properly applied for INSERT
CREATE POLICY "Admins can insert events"
ON public.events FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.troupe_members
    WHERE troupe_members.troupe_id = events.troupe_id
    AND troupe_members.user_id = auth.uid()
    AND troupe_members.role = 'admin'
  )
);

CREATE POLICY "Admins can update events"
ON public.events FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.troupe_members
    WHERE troupe_members.troupe_id = events.troupe_id
    AND troupe_members.user_id = auth.uid()
    AND troupe_members.role = 'admin'
  )
);

CREATE POLICY "Admins can delete events"
ON public.events FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.troupe_members
    WHERE troupe_members.troupe_id = events.troupe_id
    AND troupe_members.user_id = auth.uid()
    AND troupe_members.role = 'admin'
  )
);


-- 2. Redefine Event Attendance Policies
DROP POLICY IF EXISTS "Members can manage own attendance" ON public.event_attendance;
DROP POLICY IF EXISTS "Admins can manage troupe attendance" ON public.event_attendance;

-- Members can manage their own attendance
CREATE POLICY "Members can insert own attendance"
ON public.event_attendance FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members can update own attendance"
ON public.event_attendance FOR UPDATE
USING (user_id = auth.uid());

-- Admins can manage anyone's attendance in their troupe
CREATE POLICY "Admins can manage all attendance"
ON public.event_attendance FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events
    JOIN public.troupe_members ON events.troupe_id = troupe_members.troupe_id
    WHERE events.id = event_attendance.event_id
    AND troupe_members.user_id = auth.uid()
    AND troupe_members.role = 'admin'
  )
);
