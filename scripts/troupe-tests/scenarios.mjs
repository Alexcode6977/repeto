import {
  addMember,
  approveJoinRequest,
  assert,
  canAccessArtisticContent,
  canManageSessions,
  canManageTroupe,
  countRawNotes,
  createAttendance,
  createAuthedClient,
  createPlay,
  createPlayCharacter,
  createPlayScene,
  createRehearsalEvent,
  createTestUser,
  createTroupe,
  expectDuplicateJoinRequestToFail,
  expectInsertAllowed,
  expectInsertBlocked,
  expectInvalidRoleSetToFail,
  expectUpsertAllowed,
  expectUpsertBlocked,
  getFeedbacks,
  getJoinRequests,
  getMember,
  getSessionPlan,
  linkSceneCharacter,
  logCapabilityMatrix,
  normalizeMemberRoles,
  publishPendingFeedbacks,
  rejectJoinRequest,
  saveRawNoteDirect,
  selectRows,
  submitFeedbackDirect,
  submitJoinRequest,
  trackTroupe,
  trackUser,
  upsertSessionPlan,
  verifyMemberships,
  verifyPendingRequestsAreEmpty,
} from "./helpers.mjs";

export async function runHappyPath(options, state) {
  console.log(`Run: ${options.runId}`);
  console.log(`Scenario: happy-path`);
  console.log(`Members to join: ${options.memberCount}`);

  const owner = trackUser(
    state,
    await createTestUser(options.prefix, options.runId, "Owner", options.password)
  );
  console.log(`[ok] owner created: ${owner.email}`);

  const troupe = await createTroupe(
    owner.id,
    `Smoke Troupe ${options.runId}`,
    options.memberCount + 1
  );
  trackTroupe(state, troupe.id);
  console.log(`[ok] troupe created: ${troupe.name} (${troupe.join_code})`);

  const joinedUsers = [owner];
  for (let index = 1; index <= options.memberCount; index += 1) {
    const member = trackUser(
      state,
      await createTestUser(
        options.prefix,
        options.runId,
        `Member${index}`,
        options.password
      )
    );
    console.log(`[ok] member created: ${member.email}`);

    const requestId = await submitJoinRequest(troupe.id, member.id);
    console.log(`[ok] join request created for ${member.email}`);

    await expectDuplicateJoinRequestToFail(troupe.id, member.id);
    console.log(`[ok] duplicate join request blocked for ${member.email}`);

    await approveJoinRequest(troupe.id, requestId, member.id);
    console.log(`[ok] join request approved for ${member.email}`);

    joinedUsers.push(member);
  }

  await verifyMemberships(troupe.id, options.memberCount + 1, owner.id);
  console.log("[ok] troupe_members state verified");

  await verifyPendingRequestsAreEmpty(troupe.id);
  console.log("[ok] no pending join requests remain");

  const play = await createPlay(troupe.id, options.runId);
  console.log(`[ok] play created: ${play.title}`);

  const event = await createRehearsalEvent(troupe.id, play.id, options.runId);
  console.log(`[ok] rehearsal event created: ${event.title}`);

  await createAttendance(
    event.id,
    joinedUsers.slice(0, Math.min(joinedUsers.length, 3)).map((user) => user.id)
  );
  console.log("[ok] attendance rows created");
}

export async function runJoinRequestGuardrails(options, state) {
  console.log(`Run: ${options.runId}`);
  console.log(`Scenario: join-requests`);

  const owner = trackUser(
    state,
    await createTestUser(options.prefix, options.runId, "Owner", options.password)
  );
  const candidate = trackUser(
    state,
    await createTestUser(options.prefix, options.runId, "PendingUser", options.password)
  );
  console.log(`[ok] users created: ${owner.email}, ${candidate.email}`);

  const troupe = await createTroupe(owner.id, `Join Guardrails ${options.runId}`, 2);
  trackTroupe(state, troupe.id);
  console.log(`[ok] troupe created: ${troupe.name}`);

  const firstRequestId = await submitJoinRequest(troupe.id, candidate.id);
  console.log("[ok] first join request created");

  await expectDuplicateJoinRequestToFail(troupe.id, candidate.id);
  console.log("[ok] duplicate join request blocked");

  await rejectJoinRequest(firstRequestId);
  console.log("[ok] join request rejected");

  let pendingRequests = await getJoinRequests(troupe.id);
  assert(pendingRequests.length === 0, "Reject should leave no pending requests.");
  console.log("[ok] no pending requests after rejection");

  let member = await getMember(troupe.id, candidate.id);
  assert(!member, "Rejected candidate should not be a troupe member.");
  console.log("[ok] rejected user is still outside the troupe");

  const secondRequestId = await submitJoinRequest(troupe.id, candidate.id);
  console.log("[ok] second join request created");

  await approveJoinRequest(troupe.id, secondRequestId, candidate.id);
  console.log("[ok] second join request approved");

  pendingRequests = await getJoinRequests(troupe.id);
  assert(pendingRequests.length === 0, "Approve should clear the pending request.");

  member = await getMember(troupe.id, candidate.id);
  assert(member, "Approved candidate should now be a member.");
  assert(
    normalizeMemberRoles(member.roles).join(",") === "member",
    "Approved candidate should have the member role."
  );
  console.log("[ok] approved user joined with the expected role");
}

export async function runRoleMatrix(options, state) {
  console.log(`Run: ${options.runId}`);
  console.log(`Scenario: role-matrix`);

  const owner = trackUser(
    state,
    await createTestUser(options.prefix, options.runId, "Owner", options.password)
  );
  const troupe = await createTroupe(owner.id, `Role Matrix ${options.runId}`, 8);
  trackTroupe(state, troupe.id);
  console.log(`[ok] troupe created: ${troupe.name}`);

  const validCases = [
    { label: "Adjoint", roles: ["adjoint"] },
    { label: "Director", roles: ["metteur_en_scene"] },
    { label: "Member", roles: ["member"] },
    { label: "AdminMember", roles: ["admin", "member"] },
    { label: "AdjointMember", roles: ["adjoint", "member"] },
    { label: "DirectorMember", roles: ["metteur_en_scene", "member"] },
  ];

  for (const testCase of validCases) {
    const user = trackUser(
      state,
      await createTestUser(
        options.prefix,
        options.runId,
        testCase.label,
        options.password
      )
    );

    await addMember(troupe.id, user.id, testCase.roles);
    const member = await getMember(troupe.id, user.id);
    assert(member, `${testCase.label} should have been inserted.`);

    const actualRoles = normalizeMemberRoles(member.roles).join(",");
    const expectedRoles = normalizeMemberRoles(testCase.roles).join(",");
    assert(
      actualRoles === expectedRoles,
      `${testCase.label} roles mismatch. Expected ${expectedRoles}, got ${actualRoles}.`
    );

    console.log(`[ok] valid role set accepted for ${testCase.label}`);
    logCapabilityMatrix(testCase.label, testCase.roles);
  }

  const invalidUser = trackUser(
    state,
    await createTestUser(options.prefix, options.runId, "InvalidRoles", options.password)
  );
  await addMember(troupe.id, invalidUser.id, ["member"]);
  console.log("[ok] baseline member created for invalid-role tests");

  await expectInvalidRoleSetToFail(troupe.id, invalidUser.id, [], "Empty role set");
  console.log("[ok] empty role set rejected");

  await expectInvalidRoleSetToFail(
    troupe.id,
    invalidUser.id,
    ["unknown"],
    "Unknown role set"
  );
  console.log("[ok] unknown role rejected");

  await expectInvalidRoleSetToFail(
    troupe.id,
    invalidUser.id,
    ["admin", "adjoint"],
    "Admin + adjoint role set"
  );
  console.log("[ok] mutually exclusive role set rejected");

  assert(canManageTroupe(["admin"]), "Admin should manage the troupe.");
  assert(
    !canAccessArtisticContent(["admin"]),
    "Admin-only should not access artistic content in strict separation mode."
  );
  assert(canManageSessions(["metteur_en_scene"]), "Director should manage sessions.");
  assert(canAccessArtisticContent(["member"]), "Member should access artistic content.");
  console.log("[ok] capability matrix baseline is coherent");
}

export async function runSessionFlow(options, state) {
  console.log(`Run: ${options.runId}`);
  console.log(`Scenario: session-flow`);

  const owner = trackUser(
    state,
    await createTestUser(options.prefix, options.runId, "Owner", options.password)
  );
  const director = trackUser(
    state,
    await createTestUser(options.prefix, options.runId, "Director", options.password)
  );
  const actor = trackUser(
    state,
    await createTestUser(options.prefix, options.runId, "Actor", options.password)
  );

  const troupe = await createTroupe(owner.id, `Session Flow ${options.runId}`, 3);
  trackTroupe(state, troupe.id);
  console.log(`[ok] troupe created: ${troupe.name}`);

  await addMember(troupe.id, director.id, ["metteur_en_scene", "member"]);
  await addMember(troupe.id, actor.id, ["member"]);
  console.log("[ok] director and actor added to troupe");

  const play = await createPlay(troupe.id, options.runId);
  console.log(`[ok] play created: ${play.title}`);

  const character = await createPlayCharacter(play.id, "PERSONNAGE TEST", actor.id);
  const scene = await createPlayScene(play.id, "Scene test", 0);
  await linkSceneCharacter(scene.id, character.id);
  console.log("[ok] character and scene created for the session");

  const event = await createRehearsalEvent(troupe.id, play.id, options.runId);
  console.log(`[ok] rehearsal event created: ${event.title}`);

  const selectedScenes = [
    {
      id: scene.id,
      title: scene.title,
      order_index: scene.order_index,
      play_id: play.id,
    },
  ];

  await upsertSessionPlan(
    event.id,
    selectedScenes,
    "Preparation notes",
    "preparation"
  );
  let plan = await getSessionPlan(event.id);
  assert(plan, "Session plan should exist after preparation save.");
  assert(plan.status === "preparation", "Session plan should start in preparation.");
  console.log("[ok] session plan saved in preparation");

  const publishedAt = new Date().toISOString();
  await upsertSessionPlan(
    event.id,
    selectedScenes,
    "Ready for live",
    "upcoming",
    publishedAt
  );
  plan = await getSessionPlan(event.id);
  assert(plan?.status === "upcoming", "Session plan should move to upcoming.");
  assert(plan?.published_at, "Upcoming session plan should have a published_at.");
  console.log("[ok] session plan published");

  const rawNote = await saveRawNoteDirect(
    event.id,
    play.id,
    director.id,
    "La diction doit etre plus nette.",
    0,
    12
  );
  assert(rawNote.id, "Raw note should be created.");
  assert((await countRawNotes(event.id)) === 1, "One raw note should exist.");
  console.log("[ok] live raw note recorded");

  await upsertSessionPlan(
    event.id,
    selectedScenes,
    "Live ended, processing notes",
    "processing",
    publishedAt
  );
  plan = await getSessionPlan(event.id);
  assert(plan?.status === "processing", "Session plan should move to processing.");
  console.log("[ok] session moved to processing");

  const feedback = await submitFeedbackDirect(
    event.id,
    character.id,
    actor.id,
    "Travail propre, garder plus d'energie sur la fin.",
    "pending"
  );
  assert(feedback.status === "pending", "Feedback should be created as pending.");
  console.log("[ok] feedback draft created");

  await publishPendingFeedbacks(event.id);
  let feedbacks = await getFeedbacks(event.id);
  assert(feedbacks.length === 1, "One feedback should exist.");
  assert(
    feedbacks[0].status === "published",
    "Feedback should be published after finalization."
  );
  console.log("[ok] feedback published");

  await upsertSessionPlan(
    event.id,
    selectedScenes,
    "Session closed and feedback shared",
    "validated",
    publishedAt
  );
  plan = await getSessionPlan(event.id);
  assert(plan?.status === "validated", "Session plan should move to validated.");
  feedbacks = await getFeedbacks(event.id);
  assert(
    feedbacks.every((item) => item.status === "published"),
    "Validated session should keep published feedbacks."
  );
  console.log("[ok] session validated with final feedback");
}

export async function runDirectorMemberAccess(options, state) {
  console.log(`Run: ${options.runId}`);
  console.log(`Scenario: director-member-access`);

  const owner = trackUser(
    state,
    await createTestUser(options.prefix, options.runId, "Owner", options.password)
  );
  const director = trackUser(
    state,
    await createTestUser(options.prefix, options.runId, "Director", options.password)
  );
  const member = trackUser(
    state,
    await createTestUser(options.prefix, options.runId, "Member", options.password)
  );

  const troupe = await createTroupe(owner.id, `Access Matrix ${options.runId}`, 3);
  trackTroupe(state, troupe.id);
  await addMember(troupe.id, director.id, ["metteur_en_scene", "member"]);
  await addMember(troupe.id, member.id, ["member"]);
  console.log("[ok] troupe, director, and member are ready");

  const directorClient = await createAuthedClient(director);
  const memberClient = await createAuthedClient(member);
  console.log("[ok] real user sessions created");

  const play = await expectInsertAllowed(
    directorClient,
    "plays",
    {
      troupe_id: troupe.id,
      title: `Access Play ${options.runId}`,
      description: "Created by director access test.",
    },
    "Director should be able to create plays"
  );
  console.log("[ok] director can create a play");

  await expectInsertBlocked(
    memberClient,
    "plays",
    {
      troupe_id: troupe.id,
      title: `Blocked Play ${options.runId}`,
      description: "Member should not create this play.",
    },
    "Member play creation"
  );
  console.log("[ok] member cannot create a play");

  const visiblePlays = await selectRows(
    memberClient,
    "plays",
    "id,title",
    [{ type: "eq", column: "troupe_id", value: troupe.id }]
  );
  assert(
    visiblePlays.some((item) => item.id === play.id),
    "Member should be able to see troupe plays."
  );
  console.log("[ok] member can read troupe plays");

  const event = await expectInsertAllowed(
    directorClient,
    "events",
    {
      troupe_id: troupe.id,
      play_id: play.id,
      title: `Access Event ${options.runId}`,
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      type: "rehearsal",
    },
    "Director should be able to create events"
  );
  console.log("[ok] director can create an event");

  await expectInsertBlocked(
    memberClient,
    "events",
    {
      troupe_id: troupe.id,
      play_id: play.id,
      title: `Blocked Event ${options.runId}`,
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      type: "rehearsal",
    },
    "Member event creation"
  );
  console.log("[ok] member cannot create an event");

  const visibleEvents = await selectRows(
    memberClient,
    "events",
    "id,title",
    [{ type: "eq", column: "troupe_id", value: troupe.id }]
  );
  assert(
    visibleEvents.some((item) => item.id === event.id),
    "Member should be able to see troupe events."
  );
  console.log("[ok] member can read troupe events");

  await expectUpsertAllowed(
    directorClient,
    "session_plans",
    {
      event_id: event.id,
      selected_scenes: [],
      general_notes: "Director plan",
      status: "preparation",
      updated_at: new Date().toISOString(),
    },
    "Director session plan write"
  );
  console.log("[ok] director can plan a session");

  await expectUpsertBlocked(
    memberClient,
    "session_plans",
    {
      event_id: event.id,
      selected_scenes: [],
      general_notes: "Member should not plan",
      status: "preparation",
      updated_at: new Date().toISOString(),
    },
    "Member session plan write"
  );
  console.log("[ok] member cannot plan a session");

  const visiblePlans = await selectRows(
    memberClient,
    "session_plans",
    "event_id,status,general_notes",
    [{ type: "eq", column: "event_id", value: event.id }]
  );
  assert(visiblePlans.length === 1, "Member should be able to read the session plan.");
  console.log("[ok] member can read the session plan");

  const character = await createPlayCharacter(play.id, "ACCES TEST", member.id);

  await expectInsertAllowed(
    directorClient,
    "session_raw_notes",
    {
      event_id: event.id,
      play_id: play.id,
      scene_index: 0,
      line_index: 1,
      text: "Director live note",
    },
    "Director raw note write"
  );
  console.log("[ok] director can save live raw notes");

  await expectInsertBlocked(
    memberClient,
    "session_raw_notes",
    {
      event_id: event.id,
      play_id: play.id,
      scene_index: 0,
      line_index: 2,
      text: "Member raw note should be blocked",
    },
    "Member raw note write"
  );
  console.log("[ok] member cannot save live raw notes");

  const visibleRawNotes = await selectRows(
    memberClient,
    "session_raw_notes",
    "id,text",
    [{ type: "eq", column: "event_id", value: event.id }]
  );
  assert(
    visibleRawNotes.length === 0,
    "Member should not read director raw notes."
  );
  console.log("[ok] member cannot read live raw notes");

  await expectInsertAllowed(
    directorClient,
    "rehearsal_feedbacks",
    {
      event_id: event.id,
      character_id: character.id,
      actor_id: member.id,
      text: "Pending access test feedback",
      status: "pending",
      type: "feedback",
    },
    "Director feedback write"
  );
  console.log("[ok] director can draft feedback");

  await expectInsertBlocked(
    memberClient,
    "rehearsal_feedbacks",
    {
      event_id: event.id,
      character_id: character.id,
      actor_id: member.id,
      text: "Member should not create feedback",
      status: "pending",
      type: "feedback",
    },
    "Member feedback write"
  );
  console.log("[ok] member cannot draft feedback");

  const pendingFeedbacksVisibleToMember = await selectRows(
    memberClient,
    "rehearsal_feedbacks",
    "id,status,text",
    [{ type: "eq", column: "event_id", value: event.id }]
  );
  if (pendingFeedbacksVisibleToMember.length > 0) {
    console.log("[warn] member can already read pending feedbacks directly via RLS");
  } else {
    console.log("[ok] member cannot read pending feedbacks before publication");
  }

  const { error: publishError } = await directorClient
    .from("rehearsal_feedbacks")
    .update({ status: "published" })
    .eq("event_id", event.id)
    .eq("status", "pending");

  if (publishError) {
    throw new Error(`Director should be able to publish feedbacks: ${publishError.message}`);
  }
  console.log("[ok] director can publish feedbacks");

  const publishedFeedbacks = await selectRows(
    memberClient,
    "rehearsal_feedbacks",
    "id,status,text",
    [{ type: "eq", column: "event_id", value: event.id }]
  );
  assert(
    publishedFeedbacks.some((item) => item.status === "published"),
    "Member should be able to read published feedbacks assigned to them."
  );
  console.log("[ok] member can read published feedback");

  const ownAttendance = await expectInsertAllowed(
    memberClient,
    "event_attendance",
    {
      event_id: event.id,
      user_id: member.id,
      status: "present",
    },
    "Member own attendance write"
  );
  assert(ownAttendance.user_id === member.id, "Own attendance should target the member.");
  console.log("[ok] member can update their own attendance");

  await expectInsertBlocked(
    memberClient,
    "event_attendance",
    {
      event_id: event.id,
      user_id: director.id,
      status: "absent",
    },
    "Member writing someone else's attendance"
  );
  console.log("[ok] member cannot update another user's attendance");

  await expectInsertAllowed(
    directorClient,
    "event_attendance",
    {
      event_id: event.id,
      user_id: owner.id,
      status: "absent",
    },
    "Director managing another user's attendance"
  );
  console.log("[ok] director can manage attendance for others");
}

export const scenarioHandlers = {
  "happy-path": runHappyPath,
  "join-requests": runJoinRequestGuardrails,
  "role-matrix": runRoleMatrix,
  "session-flow": runSessionFlow,
  "director-member-access": runDirectorMemberAccess,
};
