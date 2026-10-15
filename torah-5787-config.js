/*
 * Public browser settings only. Never place Ko-fi verification tokens, Supabase
 * service-role keys, payment secrets, or paid lesson bodies in this file.
 *
 * Monthly membership uses the creator's official Ko-fi /tiers page.
 * A draft Ko-fi tier must be published by the account owner before checkout
 * becomes available. The browser never handles card payments.
 */
window.TORAH_5787_CONFIG = Object.freeze({
  kofiHome: "https://ko-fi.com/adamlee1986",
  supabaseUrl: "https://rdvxkzohxxgyufizxxrk.supabase.co",
  supabaseAnonKey: "sb_publishable_4EmaXysGyWLhtEnjSC8EzQ_yiM8fjOE",
  edgeFunctionName: "torah-access",
  paymentReady: true,
  membershipUrl: "https://ko-fi.com/adamlee1986/tiers"
});
