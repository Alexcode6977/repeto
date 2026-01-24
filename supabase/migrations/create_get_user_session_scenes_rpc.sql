-- RPC: Get User Specific Scenes for a Session (Bypassing RLS complexity)
-- This function securely fetches the scenes assigned to a user for a given session.

create or replace function get_user_session_scenes(p_session_id uuid)
returns json
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_troupe_id uuid;
  v_plan jsonb;
  v_scene_ids uuid[];
  v_result json;
begin
  -- 1. Get Troupe ID and Check access (User MUST be a member)
  select troupe_id into v_troupe_id from events where id = p_session_id;
  
  if v_troupe_id is null then 
    return '[]'::json; 
  end if;

  if not exists (
      select 1 from troupe_members 
      where troupe_id = v_troupe_id 
      and user_id = v_user_id
  ) then
    return '[]'::json;
  end if;

  -- 2. Get Plan
  select selected_scenes into v_plan from session_plans where event_id = p_session_id;
  if v_plan is null then return '[]'::json; end if;
  
  -- Extract IDs. Handle both string IDs and object IDs {id: "..."}
  select array_agg(
      case 
        when jsonb_typeof(item) = 'string' then item::text::uuid
        else (item->>'id')::uuid
      end
    ) 
  into v_scene_ids
  from jsonb_array_elements(v_plan) as item;

  -- 3. Build Result
  -- We select all characters of the user in this troupe
  -- And for each, we find the scenes from the plan that include them.
  select json_agg(row_to_json(t)) into v_result
  from (
    select 
      p.id as "playId",
      p.title as "playTitle",
      pc.id as "characterId",
      pc.name as "characterName",
      (
         select text 
         from rehearsal_feedbacks rf 
         where rf.character_id = pc.id 
         order by created_at desc 
         limit 1
      ) as "lastFeedback",
      coalesce((
        select json_agg(json_build_object(
          'id', ps.id,
          'title', ps.title,
          'summary', ps.summary
        ))
        from play_scenes ps
        join scene_characters sc on sc.scene_id = ps.id
        where ps.id = any(v_scene_ids)
        and sc.character_id = pc.id
      ), '[]'::json) as scenes
    from play_characters pc
    join plays p on p.id = pc.play_id
    where pc.actor_id = v_user_id
    and p.troupe_id = v_troupe_id
    -- Only return characters that actually have scenes in this session
    and exists (
        select 1 
        from play_scenes ps 
        join scene_characters sc on sc.scene_id = ps.id
        where ps.id = any(v_scene_ids)
        and sc.character_id = pc.id
    )
  ) t;

  return coalesce(v_result, '[]'::json);
end;
$$ language plpgsql;
