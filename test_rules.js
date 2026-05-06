import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';

async function runTest() {
  const testEnv = await initializeTestEnvironment({
    projectId: "little-letters-514e3",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });

  const creator = testEnv.authenticatedContext("creator_uid");
  const joiner = testEnv.authenticatedContext("joiner_uid");

  const gameId = "TESTCODE";

  // 1. Create a waiting game as creator
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.collection("games").doc(gameId).set({
      type: "tictactoe",
      status: "waiting",
      players: ["creator_uid"],
      creatorUid: "creator_uid"
    });
  });

  // 2. Try to join as joiner
  const joinerDb = joiner.firestore();
  try {
    const ref = joinerDb.collection("games").doc(gameId);
    const snap = await ref.get();
    const data = snap.data();
    
    await ref.update({
      players: [...data.players, "joiner_uid"],
      status: "playing",
      "playerNames.joiner_uid": "Joiner"
    });
    console.log("JOIN SUCCESSFUL");
  } catch (err) {
    console.error("JOIN FAILED:", err.message);
  }

  await testEnv.cleanup();
}

runTest();
