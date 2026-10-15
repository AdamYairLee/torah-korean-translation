/*
 * Public browser settings only. Never place Ko-fi verification tokens, Supabase
 * service-role keys, payment secrets, or paid lesson bodies in this file.
 *
 * Payment links deliberately remain inactive until the backend webhook,
 * membership tier and account verification are tested.
 */
window.TORAH_5787_CONFIG = Object.freeze({
  kofiHome: "https://ko-fi.com/adamlee1986",
  supabaseUrl: "https://rdvxkzohxxgyufizxxrk.supabase.co",
  supabaseAnonKey: "sb_publishable_4EmaXysGyWLhtEnjSC8EzQ_yiM8fjOE",
  edgeFunctionName: "torah-access",
  paymentReady: false,
  membershipUrl: ""
});
