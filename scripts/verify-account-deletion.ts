
import { addAccount, deleteAccount, getAccounts } from "../src/lib/services/accountService";

async function verifyAccountDeletion() {
    console.log("Starting account deletion verification...");

    // 1. Create a test account
    const testAccountName = "Test Delete Account " + Date.now();
    console.log(`Creating test account: ${testAccountName}`);
    const newAccount = await addAccount({
        name: testAccountName,
        type: "Banco",
        currentBalance: 1000,
    });
    console.log("Account created:", newAccount);

    // 2. Verify it exists
    let accounts = await getAccounts();
    const exists = accounts.some((a) => a.id === newAccount.id);
    if (!exists) {
        console.error("Failed to find created account!");
        process.exit(1);
    }
    console.log("Account verified in list.");

    // 3. Delete the account
    console.log(`Deleting account: ${newAccount.id}`);
    await deleteAccount(newAccount.id);

    // 4. Verify it is gone
    accounts = await getAccounts();
    const stillExists = accounts.some((a) => a.id === newAccount.id);
    if (stillExists) {
        console.error("Account still exists after deletion!");
        process.exit(1);
    }
    console.log("Account successfully deleted.");
}

verifyAccountDeletion().catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
});
