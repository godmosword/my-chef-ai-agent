/** Feature flags — set NEXT_PUBLIC_NEW_UI=1 on Vercel to enable the new app shell. */
export const FLAGS = {
  newUI: process.env.NEXT_PUBLIC_NEW_UI === "1",
};
