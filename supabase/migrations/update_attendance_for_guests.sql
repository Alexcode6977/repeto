-- SQL Migration: Update event_attendance to support Guests
-- Allows tracking attendance for members who don't have an auth account (troupe_guests)

-- 1. Modify event_attendance table structure
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_attendance' AND column_name='guest_id') THEN
        ALTER TABLE public.event_attendance ADD COLUMN guest_id uuid REFERENCES public.troupe_guests(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Drop the current primary key (event_id, user_id) BEFORE making user_id nullable
ALTER TABLE public.event_attendance 
DROP CONSTRAINT IF EXISTS event_attendance_pkey;

-- Make user_id nullable since it can now be a guest_id instead
ALTER TABLE public.event_attendance 
ALTER COLUMN user_id DROP NOT NULL;

-- Add a constraint to ensure either user_id or guest_id is set, but not both
-- Drop existing first to avoid duplicate constraint errors on retry
ALTER TABLE public.event_attendance 
DROP CONSTRAINT IF EXISTS user_or_guest_check;

ALTER TABLE public.event_attendance 
ADD CONSTRAINT user_or_guest_check 
CHECK (
    (user_id IS NOT NULL AND guest_id IS NULL) OR 
    (user_id IS NULL AND guest_id IS NOT NULL)
);

-- Add unique constraints to prevent double entries for the same person on the same event
DROP INDEX IF EXISTS event_user_attendance_idx;
DROP INDEX IF EXISTS event_guest_attendance_idx;

CREATE UNIQUE INDEX event_user_attendance_idx ON public.event_attendance (event_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX event_guest_attendance_idx ON public.event_attendance (event_id, guest_id) WHERE guest_id IS NOT NULL;

-- 2. Update RLS Policies for Guests Attendance
DROP POLICY IF EXISTS "Admins can manage all attendance" ON public.event_attendance;

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
