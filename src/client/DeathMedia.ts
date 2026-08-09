export type DeathMedia = "tutorial" | "battle";

interface DeathMediaAccount {
  user: {
    email?: string;
    deathTutorialSeen?: boolean;
  };
  player: {
    publicId: string;
  };
}

let guestTutorialShown = false;
const accountTutorialsShownThisPage = new Set<string>();

export async function selectDeathMedia(
  account: DeathMediaAccount | false,
  markAccountTutorialSeen: () => Promise<boolean>,
): Promise<DeathMedia> {
  if (!account || !account.user.email) {
    if (guestTutorialShown) return "battle";
    guestTutorialShown = true;
    return "tutorial";
  }

  if (
    account.user.deathTutorialSeen ||
    accountTutorialsShownThisPage.has(account.player.publicId)
  ) {
    return "battle";
  }

  accountTutorialsShownThisPage.add(account.player.publicId);
  await markAccountTutorialSeen();
  return "tutorial";
}
