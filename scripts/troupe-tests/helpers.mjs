import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

export const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const ROLE_ORDER = ["admin", "adjoint", "metteur_en_scene", "member"];
export const DEFAULT_MEMBER_COUNT = 3;
export const DEFAULT_PASSWORD = "SmokeTest!123456";

export function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

export function hasFlag(flag) {
  return process.argv.includes(flag);
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function buildRunId() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${stamp}-${randomBytes(2).toString("hex")}`;
}

export function buildJoinCode() {
  return randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
}

export function parseMemberCount() {
  const raw =
    getArgValue("--members") ?? process.env.SMOKE_TEST_MEMBER_COUNT ?? `${DEFAULT_MEMBER_COUNT}`;
  const value = Number.parseInt(raw, 10);

  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Member count must be an integer >= 1.");
  }

  return value;
}

export function normalizeMemberRoles(userRoles) {
  if (!Array.isArray(userRoles)) {
    return [];
  }

  const unique = Array.from(
    new Set(userRoles.filter((role) => ROLE_ORDER.includes(role)))
  );

  if (unique.includes("admin") && unique.includes("adjoint")) {
    const adjointIndex = unique.indexOf("adjoint");
    unique.splice(adjointIndex, 1);
  }

  return unique.sort((left, right) => {
    return ROLE_ORDER.indexOf(left) - ROLE_ORDER.indexOf(right);
  });
}

export function hasRole(userRoles, targetRole) {
  return normalizeMemberRoles(userRoles).includes(targetRole);
}

export function canManageTroupe(userRoles) {
  return hasRole(userRoles, "admin") || hasRole(userRoles, "adjoint");
}

export function canManageSessions(userRoles) {
  return hasRole(userRoles, "metteur_en_scene");
}

export function canAccessArtisticContent(userRoles) {
  const roles = normalizeMemberRoles(userRoles);
  return roles.includes("member") || roles.includes("metteur_en_scene");
}

export function canManageCalendar(userRoles) {
  return canManageTroupe(userRoles) || canManageSessions(userRoles);
}

export function describeCapabilities(userRoles) {
  return {
    manageTroupe: canManageTroupe(userRoles),
    manageCalendar: canManageCalendar(userRoles),
    manageSessions: canManageSessions(userRoles),
    accessArtisticContent: canAccessArtisticContent(userRoles),
  };
}

export function createState() {
  return {
    troupeIds: [],
    users: [],
  };
}

export function trackUser(state, user) {
  state.users.push(user);
  return user;
}

export function trackTroupe(state, troupeId) {
  state.troupeIds.push(troupeId);
  return troupeId;
}

export async function ensureProfile(user, firstName) {
  const { data: existingProfile, error: readError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    throw new Error(`Failed to read profile for ${user.email}: ${readError.message}`);
  }

  if (existingProfile) {
    return;
  }

  const { error: insertError } = await admin.from("profiles").insert({
    id: user.id,
    email: user.email,
    first_name: firstName,
    subscription_tier: "free",
    subscription_status: "active",
  });

  if (insertError) {
    throw new Error(
      `Failed to create profile for ${user.email}: ${insertError.message}`
    );
  }
}

export function requireAnonKey() {
  if (!anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. The director/member access scenario needs real user sessions."
    );
  }

  return anonKey;
}

export async function createTestUser(prefix, runId, label, password) {
  const email = `${prefix}-${runId}-${label.toLowerCase()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: label,
    },
  });

  if (error || !data.user) {
    throw new Error(`Failed to create auth user ${email}: ${error?.message}`);
  }

  await ensureProfile(data.user, label);

  return {
    id: data.user.id,
    email,
    password,
    firstName: label,
  };
}

export async function createAuthedClient(user) {
  const client = createClient(supabaseUrl, requireAnonKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  if (error) {
    throw new Error(`Failed to sign in ${user.email}: ${error.message}`);
  }

  return client;
}

export async function createTroupe(ownerId, troupeName, expectedSize) {
  const now = new Date();
  const trialEndDate = new Date(now);
  trialEndDate.setDate(trialEndDate.getDate() + 30);

  const { data: troupe, error: troupeError } = await admin
    .from("troupes")
    .insert({
      name: troupeName,
      join_code: buildJoinCode(),
      created_by: ownerId,
      subscription_tier: expectedSize > 12 ? "troupe_xl" : "troupe",
      subscription_status: "trialing",
      trial_started_at: now.toISOString(),
      trial_end_date: trialEndDate.toISOString(),
    })
    .select("id, name, join_code, subscription_tier")
    .single();

  if (troupeError || !troupe) {
    throw new Error(`Failed to create troupe: ${troupeError?.message}`);
  }

  const { error: memberError } = await admin.from("troupe_members").insert({
    troupe_id: troupe.id,
    user_id: ownerId,
    roles: ["admin"],
  });

  if (memberError) {
    throw new Error(`Failed to attach owner to troupe: ${memberError.message}`);
  }

  return troupe;
}

export async function addMember(troupeId, userId, roles) {
  const normalizedRoles = normalizeMemberRoles(roles);
  const { error } = await admin.from("troupe_members").insert({
    troupe_id: troupeId,
    user_id: userId,
    roles: normalizedRoles,
  });

  if (error) {
    throw new Error(`Failed to add member: ${error.message}`);
  }
}

export async function updateMemberRolesDirect(troupeId, userId, roles) {
  const { data, error } = await admin
    .from("troupe_members")
    .update({ roles })
    .eq("troupe_id", troupeId)
    .eq("user_id", userId)
    .select("roles")
    .single();

  return { data, error };
}

export async function getMember(troupeId, userId) {
  const { data, error } = await admin
    .from("troupe_members")
    .select("user_id, roles")
    .eq("troupe_id", troupeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read member: ${error.message}`);
  }

  return data;
}

export async function getMembers(troupeId) {
  const { data, error } = await admin
    .from("troupe_members")
    .select("user_id, roles")
    .eq("troupe_id", troupeId);

  if (error) {
    throw new Error(`Failed to read troupe members: ${error.message}`);
  }

  return data;
}

export async function submitJoinRequest(troupeId, userId) {
  const { data, error } = await admin
    .from("troupe_join_requests")
    .insert({
      troupe_id: troupeId,
      user_id: userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create join request: ${error?.message}`);
  }

  return data.id;
}

export async function expectDuplicateJoinRequestToFail(troupeId, userId) {
  const { error } = await admin.from("troupe_join_requests").insert({
    troupe_id: troupeId,
    user_id: userId,
  });

  if (!error) {
    throw new Error("Duplicate join request unexpectedly succeeded.");
  }

  if (error.code !== "23505") {
    throw new Error(`Unexpected duplicate join error: ${error.message}`);
  }
}

export async function approveJoinRequest(
  troupeId,
  requestId,
  userId,
  roles = ["member"]
) {
  const { error: memberError } = await admin.from("troupe_members").insert({
    troupe_id: troupeId,
    user_id: userId,
    roles: normalizeMemberRoles(roles),
  });

  if (memberError) {
    throw new Error(`Failed to approve join request: ${memberError.message}`);
  }

  const { error: deleteError } = await admin
    .from("troupe_join_requests")
    .delete()
    .eq("id", requestId);

  if (deleteError) {
    throw new Error(`Failed to delete join request: ${deleteError.message}`);
  }
}

export async function rejectJoinRequest(requestId) {
  const { error } = await admin
    .from("troupe_join_requests")
    .delete()
    .eq("id", requestId);

  if (error) {
    throw new Error(`Failed to delete join request: ${error.message}`);
  }
}

export async function getJoinRequests(troupeId) {
  const { data, error } = await admin
    .from("troupe_join_requests")
    .select("id, user_id")
    .eq("troupe_id", troupeId);

  if (error) {
    throw new Error(`Failed to read join requests: ${error.message}`);
  }

  return data;
}

export async function createPlay(troupeId, runId) {
  const { data: play, error } = await admin
    .from("plays")
    .insert({
      troupe_id: troupeId,
      title: `Smoke Play ${runId}`,
      description: "Created by the automated troupe smoke test.",
    })
    .select("id, title")
    .single();

  if (error || !play) {
    throw new Error(`Failed to create play: ${error?.message}`);
  }

  return play;
}

export async function createRehearsalEvent(troupeId, playId, runId) {
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

  const { data: event, error } = await admin
    .from("events")
    .insert({
      troupe_id: troupeId,
      play_id: playId,
      title: `Smoke Rehearsal ${runId}`,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      type: "rehearsal",
    })
    .select("id, title")
    .single();

  if (error || !event) {
    throw new Error(`Failed to create rehearsal event: ${error?.message}`);
  }

  return event;
}

export async function createAttendance(eventId, userIds) {
  const rows = userIds.map((userId, index) => ({
    event_id: eventId,
    user_id: userId,
    status: index === 0 ? "present" : "unknown",
  }));

  const { error } = await admin.from("event_attendance").insert(rows);

  if (error) {
    throw new Error(`Failed to create attendance rows: ${error.message}`);
  }
}

export async function createPlayCharacter(playId, name, actorId) {
  const { data, error } = await admin
    .from("play_characters")
    .insert({
      play_id: playId,
      name,
      actor_id: actorId,
    })
    .select("id, name, actor_id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create play character: ${error?.message}`);
  }

  return data;
}

export async function createPlayScene(playId, title, orderIndex = 0) {
  const { data, error } = await admin
    .from("play_scenes")
    .insert({
      play_id: playId,
      title,
      order_index: orderIndex,
    })
    .select("id, title, order_index")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create play scene: ${error?.message}`);
  }

  return data;
}

export async function linkSceneCharacter(sceneId, characterId) {
  const { error } = await admin.from("scene_characters").insert({
    scene_id: sceneId,
    character_id: characterId,
  });

  if (error) {
    throw new Error(`Failed to link scene to character: ${error.message}`);
  }
}

export async function upsertSessionPlan(
  eventId,
  selectedScenes,
  generalNotes,
  status,
  publishedAt = null
) {
  const payload = {
    event_id: eventId,
    selected_scenes: selectedScenes,
    general_notes: generalNotes,
    status,
    updated_at: new Date().toISOString(),
  };

  if (publishedAt) {
    payload.published_at = publishedAt;
  }

  const { error } = await admin.from("session_plans").upsert(payload);

  if (error) {
    throw new Error(`Failed to upsert session plan: ${error.message}`);
  }
}

export async function getSessionPlan(eventId) {
  const { data, error } = await admin
    .from("session_plans")
    .select("event_id, selected_scenes, general_notes, status, published_at")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read session plan: ${error.message}`);
  }

  return data;
}

export async function saveRawNoteDirect(
  eventId,
  playId,
  createdBy,
  text,
  sceneIndex = 0,
  lineIndex = 0
) {
  const { data, error } = await admin
    .from("session_raw_notes")
    .insert({
      event_id: eventId,
      play_id: playId,
      scene_index: sceneIndex,
      line_index: lineIndex,
      text,
      created_by: createdBy,
    })
    .select("id, text")
    .single();

  if (error || !data) {
    throw new Error(`Failed to save raw note: ${error?.message}`);
  }

  return data;
}

export async function countRawNotes(eventId) {
  const { count, error } = await admin
    .from("session_raw_notes")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (error) {
    throw new Error(`Failed to count raw notes: ${error.message}`);
  }

  return count ?? 0;
}

export async function submitFeedbackDirect(
  eventId,
  characterId,
  actorId,
  text,
  status = "pending"
) {
  const { data, error } = await admin
    .from("rehearsal_feedbacks")
    .insert({
      event_id: eventId,
      character_id: characterId,
      actor_id: actorId,
      text,
      status,
      type: "feedback",
    })
    .select("id, status, actor_id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create feedback: ${error?.message}`);
  }

  return data;
}

export async function publishPendingFeedbacks(eventId) {
  const { error } = await admin
    .from("rehearsal_feedbacks")
    .update({ status: "published" })
    .eq("event_id", eventId)
    .eq("status", "pending");

  if (error) {
    throw new Error(`Failed to publish feedbacks: ${error.message}`);
  }
}

export async function getFeedbacks(eventId) {
  const { data, error } = await admin
    .from("rehearsal_feedbacks")
    .select("id, actor_id, status, text")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to read feedbacks: ${error.message}`);
  }

  return data;
}

export async function verifyMemberships(troupeId, expectedCount, ownerId) {
  const members = await getMembers(troupeId);

  assert(
    members.length === expectedCount,
    `Expected ${expectedCount} members, got ${members.length}.`
  );

  const owner = members.find((member) => member.user_id === ownerId);
  assert(owner, "Owner is missing from troupe_members.");
  assert(
    Array.isArray(owner.roles) && owner.roles.includes("admin"),
    "Owner does not have the admin role."
  );
}

export async function verifyPendingRequestsAreEmpty(troupeId) {
  const data = await getJoinRequests(troupeId);
  assert(data.length === 0, "Some join requests were not cleared.");
}

export async function expectInvalidRoleSetToFail(
  troupeId,
  userId,
  roles,
  label
) {
  const { error } = await updateMemberRolesDirect(troupeId, userId, roles);

  if (!error) {
    throw new Error(`${label} unexpectedly succeeded.`);
  }

  if (error.code && error.code !== "23514") {
    throw new Error(`${label} failed with an unexpected error: ${error.message}`);
  }
}

export function logCapabilityMatrix(label, roles) {
  const capabilities = describeCapabilities(roles);
  console.log(
    `[capability] ${label} (${normalizeMemberRoles(roles).join(", ")}) ` +
      `manage=${capabilities.manageTroupe ? "yes" : "no"} ` +
      `calendar=${capabilities.manageCalendar ? "yes" : "no"} ` +
      `sessions=${capabilities.manageSessions ? "yes" : "no"} ` +
      `artistic=${capabilities.accessArtisticContent ? "yes" : "no"}`
  );
}

export async function expectInsertAllowed(client, table, payload, label) {
  const { data, error } = await client
    .from(table)
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`${label} (expected allow, got ${error?.message})`);
  }

  return data;
}

export async function expectInsertBlocked(client, table, payload, label) {
  const { error } = await client.from(table).insert(payload);

  if (!error) {
    throw new Error(`${label} unexpectedly succeeded.`);
  }

  return error;
}

export async function expectUpsertAllowed(client, table, payload, label) {
  const { error } = await client.from(table).upsert(payload);

  if (error) {
    throw new Error(`${label} should be allowed, got ${error.message}`);
  }
}

export async function expectUpsertBlocked(client, table, payload, label) {
  const { error } = await client.from(table).upsert(payload);

  if (!error) {
    throw new Error(`${label} unexpectedly succeeded.`);
  }

  return error;
}

export async function selectRows(client, table, columns, filters = []) {
  let query = client.from(table).select(columns);

  for (const filter of filters) {
    query = query[filter.type](filter.column, filter.value);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to read ${table}: ${error.message}`);
  }

  return data;
}

export async function cleanup(state, keepData, scenarioName) {
  if (keepData) {
    console.log("");
    console.log(`Data kept for inspection (${scenarioName}).`);
    for (const troupeId of state.troupeIds) {
      console.log(`Troupe: ${troupeId}`);
    }
    for (const user of state.users) {
      console.log(`User: ${user.email} / ${user.password}`);
    }
    return;
  }

  for (const troupeId of [...state.troupeIds].reverse()) {
    const { error } = await admin.from("troupes").delete().eq("id", troupeId);
    if (error) {
      console.error(`Cleanup warning (troupe ${troupeId}): ${error.message}`);
    }
  }

  for (const user of state.users) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(`Cleanup warning (${user.email}): ${error.message}`);
    }
  }
}
