UPDATE public.scripts 
SET vocalization_status = 'completed', vocalization_progress = 100
WHERE vocalization_status = 'pending' AND vocalization_progress = 0;
